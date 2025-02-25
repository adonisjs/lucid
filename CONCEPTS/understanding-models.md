# Lucid internals - Understanding Models

## Terms

- **Model properties**: Model instance values (excluding those inherited from the `BaseModel`) are called model properties.
- **Model attributes**: Model properties backend by database columns are called attributes. They can have different names in JavaScript and the database.
- **Getters-Setters**: Getters and setters refer to standard JavaScript getters-setters. There is no Lucid magic or behavior around them.
- **Casting properties**: Casts are transformations you can apply to properties when a model is hydrated with database (aka adapter) results.
- **Value objects**: Value objects can encapsulate casts, serializers, and other lifecycle methods of a property.
- **Dirty attributes tracking**: Dirty attributes tracking is used to find the attributes that have changed locally after fetching them from the database. Only attributes are tracked, not all the properties. Dirty tracking is needed to see what should be updated when you call `model.save()`.
- **Preparing attributes for persistence**: Preparing attributes for persistence is converting JavaScript values to a format that can be saved inside the database. Value objects can be used for this.
- **Serializing properties**: Serializing properties convert model instance values to plain objects with data types supported by JSON.

| Behavior        | Properties | Attributes | Computed |
| --------------- | ---------- | ---------- | -------- |
| Casting         | ✅         | ✅         | ✅       |
| Dirty tracking  | ❌         | ✅         | ❌       |
| Persisted to DB | ❌         | ✅         | ❌       |
| Serialized      | ❌         | ✅         | ✅       |

## Model properties vs attributes

Model properties refer to the properties that are defined on the model instance. This does not include prototype members and the properties inherited from the BaseModel. You can access model properties and their values as a plain object using the `model.toObject` method.

```ts
class User extends BaseModel {
  @Column()
  declare username: string

  declare someNonDbProperty: string
}

const user = new User()
user.toObject() // {}

user.username = 'virk'
user.toObject() // { username: 'virk' }

user.someNonDbProperty = 'yes'
user.toObject() // { username: 'virk', someNonDbProperty: 'yes' }
```

Getters are not included in the `model.toObject()` output since they are assigned to the prototype, not the class instance. However, you can include them using the `@Column` decorator or the `@Computed` decorator.

```ts
class User extends BaseModel {
  @Column()
  declare firstName: string

  @Column()
  declare lastName: string

  @Computed()
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}

const user = new User()
user.firstName = 'Harminder'
user.lastName = 'Virk'

user.toObject()
/**
  {
    firstName: 'Harminder',
    lastName: 'Virk',
    fullName: 'Harminder Virk'
  }
*/
```

### Attributes

Attributes are a subset of the model properties backed by database columns. Attributes are hydrated with the results of a database query and persisted in the table when you call `model.save()`.

You can define an attribute using the `@Column` decorator (as shown in previous examples).

### Computed properties

Computed properties are a subset of the model properties using the `@Computed` decorator. You should only mark a property as computed if you want its value in the output of `model.toJSON()`.

In the following example, the `markdownProcessor` property can be accessed from the model instance (like any other class property). Since we don't want to send this property in a JSON response to the client, there is no need to use the `@Computed` decorator.

```ts
class Post extends BaseModel {
  markdownProcessor = new SomeMarkdownProcess()
}

const post = new Post()
post.markdownProcessor // get
post.markdownProcessor = new SomeOtherProcessor() // set
```

## Hydrating model with database results

Hydrating is the process of defining model properties from the database results.

```ts
class User extends BaseModel {
  @Column()
  declare firstName: string

  @Column()
  declare lastName: string
}

const user = new User()

/**
 * ------------------------------------------
 */
const dbResult = {
  first_name: 'Harminder',
  last_name: 'Virk',
}
user.$hydrateUsingAdapterResults(dbResult)
/**
 * ------------------------------------------
 */

user.firstName // Harminder
user.lastName // Virk
```

One thing to notice is the conversion of property names between the `dbResult` and the model attributes. This is something models are designed to handle. You can use naming strategies to have database column names in `snake_case` and model attribute names in `camelCase`. Also, you can use a different name altogether via the `columnName` decorator option.

```ts
class User extends BaseModel {
  @Column({ columName: 'u_fname' })
  declare firstName: string

  @Column({ columName: 'u_lname' })
  declare lastName: string
}
```

When you hydrate a model with additional values not defined as properties on the model, they will be added to the `$extras` object. For example:

```ts
class User extends BaseModel {
  @Column()
  declare firstName: string

  @Column()
  declare lastName: string
}

const user = new User()

/**
 * ------------------------------------------
 */
const dbResult = {
  first_name: 'Harminder',
  last_name: 'Virk',
  posts_count: '200', // aggregation result
  team_name: 'core', // join column
}
user.$hydrateUsingAdapterResults(dbResult)
/**
 * ------------------------------------------
 */

user.$extras // { posts_count: '200', team_name: 'core' }
```

You can define getters for these extra properties to have some type-safety. For example:

```ts
class User extends BaseModel {
  @Column()
  declare firstName: string

  @Column()
  declare lastName: string

  /**
   * ------------------------------------------
   */
  get teamName(): string | undefined {
    return this.$extras.team_name
  }
  /**
   * ------------------------------------------
   */
}
```

If you define a model instance property for the same name, it will be set instead of moving the property under the `$extras` object.

```ts
class User extends BaseModel {
  @Column()
  declare firstName: string

  @Column()
  declare lastName: string

  /**
   * You will have to initialize the property with some value, otherwise
   * the property will be omitted in the JS output and won't exist
   * at runtime.
   */
  team_name: string | undefined = undefined
}

const dbResult = {
  first_name: 'Harminder',
  last_name: 'Virk',
  posts_count: '200', // aggregation result
  team_name: 'core', // join column
}

const user = new User()
user.$hydrateUsingAdapterResults(dbResult)

user.$extras // { posts_count: '200' }
```

### Casting values

Another aspect of hydrating models involves casting values before setting them as model properties. For example, you can cast a JSON object from the database to an instance of the `Address` class (known as a value object).

You can define casts for any property on the model instance, not just attributes. However, you must use the `@Property` decorator on standard class properties to define the callback for casting values.

The following example assumes that the email is stored as an encrypted value in the database. Therefore, we use the `consume` method to decrypt it before setting it as a value on the model instance.

The `karma` property is an aggregate we constructed in our SQL query. Since the database returns the aggregate value as a `string`, we convert it to a number before setting it on the model.

> Note: The consume method is only called when the value is fetched from the database. So, for non-nullable columns, the value will always be present.

```ts
class User {
  @Property({
    consume(value) => {
      return Number(value)
    }
  })
  declare karma: number

  @Column({
    consume(value) => {
      return encryption.decrypt(value)
    }
  })
  declare email: string
}

const user = new User()
user.$hydrateUsingAdapterResults({
  karma: '1332',
  email: 't5iqLN8S_VKKfPW4m-Gws0xiXmrRS0cObL4waN_fWd0.VnM2NmdRdE9uNU1jOUtfWQ.T_7aoSzLTGARiMqt5-OgdBLjZSMNGsSa_atuImnO5i0'
})

user.karma // 1332
user.email // foo@bar.com
```

### Originals

When hydrating a model, Lucid maintains two copies of the data under the `$attributes` and the `$originals` objects. The `$originals` are never mutated and kept as a reference to track the changes for dirty attributes. Also, the `$originals` object only contains the model attributes.

Since hydration creates two copies of the attributes, the casts are executed twice.

## Tracking dirty attributes

Dirty attributes refer to the properties changed locally after hydrating the model. The changes are tracked between the `$attributes` and the `$original` objects.

- Primitive values are compared using the JavaScript [strict equality check](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality).
- Objects and Arrays are compared using [fast-deep-equal](https://github.com/epoberezkin/fast-deep-equal).
- All other rich data types should use **Value objects** and implement a custom strategy to detect changes in the value.

## Preparing model for persistence

When a model is prepared for persistence (i.e., `INSERT` and `UPDATE`), Lucid will check for `$attributes` during creation and `$dirty` properties during the update. If one or more attributes are changed, a database query will be issued.

Before providing values to the underlying adapter, the attributes will be prepared for persistence by invoking the `prepare` hook for Value objects or the `prepare` method provided to the `@Column` decorator.

In the following example, we convert the Coordinates to the `Point(lat lon)` SQL expression using the `prepare` method.

```ts
class User {
  @Column({
    prepare([lat, lon]: [number, number]) {
      return db.raw(`POINT(${lat} ${lon})`)
    },
  })
  location: [number, number]
}
```

The above example can be encapsulated in a Value Object as follows.

```ts
class Point {
  constructor(
    public lat,
    public lon
  ) {}

  prepare() {
    return db.raw(`POINT(${this.lat} ${this.lon})`)
  }
}

class User {
  @Column()
  location: Point
}
```

## Type-safe model serialization

Model serialization is the process of converting model instances (e.g., JavaScript classes) to plain objects with data types supported by JSON.

Since we want the model serialization to be type-safe, we must be explicit about the properties we want to serialize in our code. In a nutshell, we should be able to guide TypeScript through the following operations.

- **Pick/omit properties**: Define the properties we want to serialize.
- **Remap property names**: Serializing a property with a different name than the one used in the model.
- **Get the JSON type for a value**: Since model properties can use rich data types like classes, maps, and BigInt, we need a way to infer what their serialized (aka JSON) output will look like. This is where Value objects will come in handy.

In order to perform the above-defined operations in a type-safe manner, we will have to use some newer APIs and get rid of the existing ones. Don't worry; the existing APIs won't be removed from Lucid; it's just that projects that need type-safe serialization should not use them.

> You can play with the final example in the [TypeScript Playground](https://www.typescriptlang.org/play/?experimentalDecorators=true&emitDecoratorMetadata=true#code/C4TwDgpgBAQghgZwgWQPYBMIBsDSEQJQC8UA5ACRzDABOAlgEYCuwECpUAPmeavQOZ0AdnCzsuPdHRqhSAKDkAzJkIDGwOqiFQAgtXrNWACgCUUAN5yoUGhGBMa25Wo1aoR4HBr87ALihwQiAANFBgNKhg-oEgZuYAvnKJcqpYiIQAIlQQACp0ALbQltZI9KJ0AF4Qpv4ItML8FlbWNnYO2qRYTAAeWgC06Nl9dfRC-PLWicmp6bCIKBjYTdaU+owsbMQWiSt8dIIiYlsJzT7AUORSMiCmyy229o7bzVMKEN1gfOegkFAACg8NIoQAAeHIAPmOzT6tjg6C0WBAUAA2jgoMIoABrfCoRRQHIAXX8OVRBKSUAAZM85D9oAAxOhYVg0NCYXD4BAg1nYUJ4AhQd6sIToQjYkC4qDcrCQkjFFFojF8hBEqBowUQYWEeBIKVKqAAfigQggADcIDQoP4paSBd0hSKoHSVOpNNpDcazRb-DgkqiOWTafiaIEEIo+PkpQDIubQAA1URMCAg2MyqCx232wjmKClOjlKo1dFCRTmqAAJSg8QN5ctaZp4GgZYg+TgYGTCbYoWQrbADVTctRRaxOLx8a6mypIwaKrVdo1DrFEu7YF7Y2r2bFVp7DVJoRNHf8Y8TCBtVf8G-w3r3B7THZPOAJld9i9Hd8pOfqYzJ9d+AFUhK6TbLlyGbzlmw4gLUn78AA3FA+7jtEQSVv2zSDhiyDIqQYqkASKqYaQCGJrhSQKDMCCEAAyuaeZYJU5pcosWChKoWh1KqHKgZqEFLkxXbbmu6rcdm6HaEqKpTmuVbcComCKMIEDoFsskQPJxroJCcp1FQdCqFAYY0IxbIsWx5x6kJC4jpKTHgkY+RMVafEQQg-iwvCQiIhxBDIgScTNNYDztEaEAAO5QNRZR0VUNB2U5YoICYLwKNYrFCCMTDqHwRhgEwDB0Xp9lso5xlhLl+XOa5EBwgiSJKj5oQ5XlulQC2K4NPq-h-F4GiiFyAn8OCcTJNYvaqJiIKzpmXkILZ8Xej5fktK0jzaMaYURbR9GGVKvL8W1Yy2cAAAWdAIAAdIVPLOaEx2nRd-WJZMyVQKg+R0MAE1cQ6SqzRy82+XcAVtE8a3hTR+YMTtgMtMiyBDuJVpfYQaLuqapZWv5lZ+gQBJ7auA0eCd52XcxUC3ed8VnfJTLmkYRiYmYRCQgAhJTwipEwmAIPTATIyYZiIND1iw-D-qIxZyPVh66OSpj8TY8q9Vk0T937fwj1Ps0titSCQH9bZ2v9f4etq4t9zA6toVg5FW1GVdSqhHKS2idNM5IzxeIm-j1ZezuD7vpJjTegH0Fy4dKskzdKvxY7UBnfH5Oq-joTx2dhtq5WvNQComJCKgIXaILTswwqYli6q7svuWKD9T7Ndqzak7QbWaJN6M-Byxrw1k6gABSlEAPIAHKFsu3sS9nwqqQpSmGiJpeOoyzK6hydukz9Ko5MGaUGRGTFRpA1xHkm1oPpCZ7-ICdDAiC-6AfXuvNq2ILz0ODI0yyTFKmvvIcuCm-b1DOGSMERD5xg7GvUk59QgAFFugc0wH1NWoQVJqUUuCDBmlMaBSeInEmWcx4NHdqgme1YAR2CBKCV+GJ37Ly-qvKGG9iSAN3iA6MR8IGnwJOfSE-g75aBNo-HW1DtC0PNCvAgP9pr-2YSGVh+9QExhAMfSBZ9KywPgV0RBhCxgoKnmgjSGCkrJHeJ8GQUByKEF-KUSiqgjpP3dtqBYbI7jaQ0HpVY9RDBsCHnAQohASDIkxqQOg6BSDBGCfJGgdRfGFHCcEtIMS-EQHiUtUgT9GSpJaKQMA6QQp8DCREtJcJ0C2Aolk6wpBVCwlYOgPQFSyBMDAIMWp9SilQEfILVKdRmhuOauQViXR8hCFiZsQJwTQkNNIFEuoAB9EQcT2mVMScAeZySpkZKwFM3JFF8k0EKcEkpZT2BLLINUqqtTZlUCmU0lpikrnACyZ0wg3TgDPQAAJ6C8RsUwzRMAzFsOidA-ghBMHyAwc0HyvkGB+Rrf5aRAUzOAKMqC7coVrG8b86w8KvDQBWSij8aLmifIxbCv5EAAXQE2aiho6LvnGDhRShF0AdkID2cCwltLiXQvWAy8llKAjoFKWwFyAQgh0phXy7FTLcUWJqYpPQ-gsisDyIUCVvLqiMoFbc7IdTgBKuyKqiApEyKJMIDoIVxzj4DwYAAKwpR9A+M07ivJoBlYAWVGrlXCJEUVTqhq9PBlFTVnVQFZmwRbZWd0fVgAQMYt4HwvgWLNVAaxpYJ5ppoLY+xLY7g4sBUckV-gLXCootau1DqX6YxGBAPwnKxiY1UO9SC9aO5LTcRAGlDalqrlYpgEFYKIU0BeOCZ6Zx9JMCwFgUZhZA7QxwdoAABuQcwickWjKrCuxO+LknxEXUlQNNsqg8u8dzM2QMVrW02tFKmWVyahGRKnTNZ1PGSp8ckhAoRpmTunes3yZ1XrvSMFhVl7LcJdxNa87OpQtig0zb8qDuYIYWhIEwUoZ0kPBpPRsM9Z0PX92HqYIAA)

**The following class is auto-generated by Lucid**

```ts
export class UserSchema extends BaseModel {
  static $attributesNames = [
    'id',
    'firstName',
    'lastName',
    'email',
    'password',
    'address',
    'createdAt',
    'updatedAt',
  ] as const
  static $columnNames = [
    'id',
    'first_name',
    'last_name',
    'email',
    'password',
    'address',
    'created_at',
    'updated_at',
  ] as const

  @Attribute()
  declare id: number

  @Attribute()
  declare firstName: string

  @Attribute()
  declare lastName: string

  @Attribute()
  declare email: string

  @Attribute()
  declare password: string

  @Attribute()
  declare address: any

  @Attribute()
  declare createdAt: DateTime

  @Attribute()
  declare updatedAt: DateTime
}
```

**The following code will be under the `app/models` directory and managed by you manually**.

Here, we are not using the `@Computed` decorator on the `fullName`. Instead, we explicitly tell the Serializer to include the `fullName` property. Doing so impacts both the runtime and the type inference.
We redeclare the `address` property to use the `AddressValueObject` and precisely define the properties of the address saved as JSON within the database.

```ts
class AddressValueObject<Props> {
  constructor(public props: Props) {}

  static consume(address: string) {
    return new AddressValueObject(JSON.parse(address))
  }
  prepare() {
    return JSON.stringify(this.props)
  }
  serialize(): Props {
    return this.props
  }
}

export class User extends UserSchema {
  declare address: AddressValueObject<{
    street: string
    city: string
    state: string
    pincode: number
  }>

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  serializeAttributes() {
    return Serializer.for(this, [...User.$attributesNames, 'fullName']).omit(['password'])
  }
}
```

The new `Serializer` class also allows further picking/omitting values at runtime. For example, You can do the following.

```ts
const user = new User()

user.serializeAttributes().pick(['id', 'fullName', 'email']).toJSON()
/**
 * TYPES
  {
    id: number;
    email: string;
    fullName: string;
  }
 */
```

If the properties you try to pick are unknown, you will end up with the superset of properties defined when creating the Serializer instance. For example:

```ts
const user = new User()

const props = request.input('fields') as any
user.serializeAttributes().pick(props).toJSON()

/**
 * TYPES
  {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: number;
    };
    createdAt: string;
    updatedAt: string;
    fullName: string;
  }
 */
```

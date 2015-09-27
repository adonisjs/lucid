'use strict'

const path = require('path')
const chai = require('chai')
const expect = chai.expect
const co = require('co')
const Ioc = require('adonis-fold').Ioc
const Database = require('../../src/Database')
const Model = require('../../src/Orm/Proxy/Model')
const StaticProxy = require('../../src/Orm/Proxy/Static')
const _ = require('lodash')

let Env = {
  get: function(){
    return 'sqlite'
  }
}

let Config = {
  get: function(name){
    return {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname,'./storage/test.sqlite3')
      },
      debug: true
    }
  }
}

const db = new Database(Env,Config)

describe('Model Relations', function () {

  it('should be able to define hasOne relationship using hasOne method', function(done) {

  	/**
  	 * Phone model binded to Ioc container
  	 * under App/Model/Phone namespace
  	 */
    class Phone extends Model{

    }
    Phone.database = db; Phone = Phone.extend()
    Ioc.bind('App/Model/Phone', function() {
    	return Phone
    })

    class User extends Model{
      phone(){
        return this.hasOne('App/Model/Phone')
      }
    }
    User.database = db; User = User.extend()

    User
    .with(['phone'])
    .fetch()
    .then(function(user){
      expect(user.first().phone).to.be.an('object')
      expect(user.first().phone).to.have.property('user_id')
      done()
    })
    .catch(done)
  })


  it('should be able to define hasOne relationship with additional query on relational model', function(done) {

    /**
     * Phone model binded to Ioc container
     * under App/Model/Phone namespace
     */
    class Phone extends Model{

    }
    Phone.database = db; Phone = Phone.extend()
    Ioc.bind('App/Model/Phone', function() {
      return Phone
    })

    class User extends Model{
      phone(){
        return this.hasOne('App/Model/Phone').query(function (builder) {
          builder.where('is_mobile',0)
        })
      }
    }
    User.database = db; User = User.extend()

    User
    .with(['phone'])
    .fetch()
    .then(function(user){
      expect(user.first().phone).to.be.an('object')
      expect(user.first().phone).not.to.have.property('user_id')
      done()
    })
    .catch(done)
  })


  it('should be able to define multiple hasOne relationship using hasOne method', function(done) {

    /**
     * Phone model binded to Ioc container
     * under App/Model/Phone namespace
     */
    class Phone extends Model{

    }
    Phone.database = db; Phone = Phone.extend()
    Ioc.bind('App/Model/Phone', function() {
      return Phone
    })


    /**
     * Car model binded to Ioc container
     * under App/Model/Car namespace
     */
    class Car extends Model{

    }
    Car.database = db; Car = Car.extend()
    Ioc.bind('App/Model/Car', function() {
      return Car
    })

    class User extends Model{
      phone(){
        return this.hasOne('App/Model/Phone')
      }
      cars() {
        return this.hasOne('App/Model/Car','id','onwer_id')
      }
    }
    User.database = db; User = User.extend()

    User
    .with(['phone','cars'])
    .fetch()
    .then(function(user){
      expect(user.first().phone).to.be.an('object')
      expect(user.first().phone).to.have.property('user_id')
      expect(user.first().cars).to.be.an('object')
      expect(user.first().cars).to.have.property('onwer_id')
      done()
    })
    .catch(done)
  })


  it('should be able to define belongsTo relationship using belongsTo method', function(done) {

    /**
     * Phone model binded to Ioc container
     * under App/Model/Phone namespace
     */
    class Phone extends Model{
      user(){
        return this.belongsTo('App/Model/User')
      }
    }
    Phone.database = db; Phone = Phone.extend()


    class User extends Model{
    }
    User.database = db; User = User.extend()
    Ioc.bind('App/Model/User', function() {
      return User
    })

    Phone
    .with(['user'])
    .fetch()
    .then(function(phone){
      expect(phone.first().user).to.be.an('object')
      expect(phone.first().user).to.have.property('id')
      done()
    })
    .catch(done)
  })


  it('should be able to fetch belongsTo relationship values for a single result', function(done) {

    /**
     * Phone model binded to Ioc container
     * under App/Model/Phone namespace
     */
    class Phone extends Model{
      user(){
        return this.belongsTo('App/Model/User')
      }
    }
    Phone.database = db; Phone = Phone.extend()


    class User extends Model{
    }
    User.database = db; User = User.extend()
    Ioc.bind('App/Model/User', function() {
      return User
    })

    Phone
    .first()
    .with(['user'])
    .fetch()
    .then(function(phone){
      expect(phone.toJSON().user).to.be.an('object')
      expect(phone.toJSON().user).to.have.property('id')
      done()
    })
    .catch(done)
  })

  it('should be able to define hasMany relationship', function(done) {

    /**
     * Phone model binded to Ioc container
     * under App/Model/Phone namespace
     */
    class Phone extends Model{

    }
    Phone.database = db; Phone = Phone.extend()
    Ioc.bind('App/Model/Phone', function() {
      return Phone
    })

    class User extends Model{
      phone(){
        return this.hasMany('App/Model/Phone')
      }
    }
    User.database = db; User = User.extend()

    User
    .with(['phone'])
    .fetch()
    .then(function(user){
      expect(user.first().phone).to.be.an('array')
      expect(user.first().phone[0]).to.have.property('user_id')
      done()
    })
    .catch(done)
  })


  it('should be able to many to many relationship using belongsToMany method with correct relation keys', function() {

    class Book extends Model{
    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
      books(){
        return this.belongsToMany('App/Model/Book')
      }
    }
    Ioc.bind('App/Model/Author', function() {
      return Author
    })
    Author.database = db; Author = Author.extend()

    new Author().belongsToMany('App/Model/Book')
    const relationDefination = Author._activeRelation
    expect(relationDefination.pivotTable).to.equal('authors_books')
    expect(relationDefination.pivotPrimaryKey).to.equal('author_id')
    expect(relationDefination.pivotOtherKey).to.equal('book_id')

    new Book().belongsToMany('App/Model/Author')
    const reverseDefination = Author._activeRelation
    expect(reverseDefination.pivotTable).to.equal('authors_books')

  })

  it('should be able to define belongsToMany relation and fetch related values', function (done) {

    class Book extends Model{
    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
      books(){
        return this.belongsToMany('App/Model/Book','books_authors')
      }
    }

    Author.database = db; Author = Author.extend()
    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Author
    .with(['books'])
    .fetch()
    .then (function (author) {
      expect(author.first()).to.have.property('books')
      expect(author.first().books).to.be.an('array')
      expect(author.first().books[0]).to.be.property('_pivot_author_id')
      done()
    }).catch(done)

  })


  it('should be able to define belongsToMany relation with additional query on top of it', function (done) {

    class Book extends Model{
    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
      books(){
        return this
        .belongsToMany('App/Model/Book','books_authors')
        .query (function (builder) { 
          builder.whereNot('book_title','Php For Noobs')
        })
      }
    }

    Author.database = db; Author = Author.extend()
    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Author
    .with(['books'])
    .fetch()
    .then (function (author) {
      expect(author.first()).to.have.property('books')
      expect(author.first().books).to.be.an('array')

      _.each( author.first().books, function (book) {
        expect(book.book_title).not.to.equal('Php For Noobs')
      })

      done()
    }).catch(done)

  })


  it('should be able to define belongsToMany relation with additional query on pivot table', function (done) {

    class Book extends Model{
    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
      books(){
        return this
        .belongsToMany('App/Model/Book','books_authors')
        .query(function (builder) {
          builder.where('books_authors.is_primary',1).andWhere('books_authors.deleted_at',null)
        })
      }
    }

    Author.database = db; Author = Author.extend()
    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Author
    .with(['books'])
    .fetch()
    .then (function (author) {
      expect(author.first()).to.have.property('books')
      expect(author.first().books).to.be.an('array')
      expect(author.first().books).to.have.length(0)
      done()
    }).catch(done)

  })

 it('should be able to define belongsToMany to opposite model too', function (done) {

    class Book extends Model{

      author () {
        return this
        .belongsToMany('App/Model/Author','books_authors')
        .query ( function (builder) {
          builder.where('books_authors.is_primary',1)
        })
      }

    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
    }

    Author.database = db; Author = Author.extend()
    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Book
    .with(['author'])
    .fetch()
    .then (function (book) {
      expect(book.first()).to.have.property('author')
      expect(book.first().author).to.be.an('array')
      expect(book.first().author[0]).to.be.property('_pivot_book_id')
      done()
    }).catch(done)

  })


 it('should be able to define extra columns to fetch from pivot table under belongsToMany relation', function (done) {

    class Book extends Model{

      author () {
        return this
        .belongsToMany('App/Model/Author','books_authors')
        .query ( function (builder) {
          builder.where('books_authors.is_primary',1)
        })
        .withPivot('is_primary')
      }

    }
    Book.database = db; Book = Book.extend()
    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
    }

    Author.database = db; Author = Author.extend()
    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Book
    .with(['author'])
    .fetch()
    .then (function (book) {
      expect(book.first()).to.have.property('author')
      expect(book.first().author).to.be.an('array')
      expect(book.first().author[0]).to.be.property('_pivot_book_id')
      expect(book.first().author[0]).to.be.property('is_primary')
      done()
    }).catch(done)

  })

  
  it('should be able to using relation model scope methods when fetching related values', function (done) {

    class Book extends Model{

      author () {
        return this.belongsToMany('App/Model/Author','books_authors')
      }

    }
    Book.database = db; Book = Book.extend()

    Ioc.bind('App/Model/Book', function() {
      return Book
    })

    class Author extends Model{
      
      scopeNotVirk(query) {
        return query.whereNot('author_name','virk')
      }
    
    }

    Author.database = db; Author = Author.extend()

    Ioc.bind('App/Model/Author', function() {
      return Author
    })

    Book
    .with(['author'])
    .scope('author', function (query) {
      query.notVirk()
    })
    .fetch()
    .then (function (book) {
      expect(book.first()).to.have.property('author')
      expect(book.first().author).to.be.an('array')

      _.each(book.first().author, function (author) {
        expect(author.author_name).not.to.equal('virk')
      });

      done()
    }).catch(done)

  })
  
  

})

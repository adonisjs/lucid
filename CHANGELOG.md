<a name="3.0.5"></a>
## [3.0.5](https://github.com/adonisjs/adonis-lucid/compare/v3.0.4...v3.0.5) (2016-09-26)


### Features

* add support for named exceptions ([7e05830](https://github.com/adonisjs/adonis-lucid/commit/7e05830))
* **lucid:** add aggregates on relationship ([584de74](https://github.com/adonisjs/adonis-lucid/commit/584de74)), closes [#48](https://github.com/adonisjs/adonis-lucid/issues/48)
* **lucid:traits:** add support for assigning traits ([46773d8](https://github.com/adonisjs/adonis-lucid/commit/46773d8))


### Performance Improvements

* **lucid:hooks:** resolve hooks when adding ([17588c5](https://github.com/adonisjs/adonis-lucid/commit/17588c5))



<a name="3.0.4"></a>
## [3.0.4](https://github.com/adonisjs/adonis-lucid/compare/v3.0.3...v3.0.4) (2016-08-14)


### Bug Fixes

* **lucid:relations:** keep relation output consistent ([c74e081](https://github.com/adonisjs/adonis-lucid/commit/c74e081)), closes [#45](https://github.com/adonisjs/adonis-lucid/issues/45)


### Features

* **lucid:** add fresh method to grab fresh instance ([4d72794](https://github.com/adonisjs/adonis-lucid/commit/4d72794))
* **lucid:** add static truncate ([87f16a2](https://github.com/adonisjs/adonis-lucid/commit/87f16a2))
* **lucid:** add support for fill method ([fee8e31](https://github.com/adonisjs/adonis-lucid/commit/fee8e31))
* **lucid:** add support for findByOrFail ([2ec6a52](https://github.com/adonisjs/adonis-lucid/commit/2ec6a52))
* **lucid:** add support for transactions ([59cfa02](https://github.com/adonisjs/adonis-lucid/commit/59cfa02)), closes [#43](https://github.com/adonisjs/adonis-lucid/issues/43)



<a name="3.0.3"></a>
## [3.0.3](https://github.com/adonisjs/adonis-lucid/compare/v3.0.2...v3.0.3) (2016-08-12)


### Bug Fixes

* **lucid:** consider dirty values after beforeHooks ([b22d904](https://github.com/adonisjs/adonis-lucid/commit/b22d904)), closes [#44](https://github.com/adonisjs/adonis-lucid/issues/44)



<a name="3.0.2"></a>
## [3.0.2](https://github.com/adonisjs/adonis-lucid/compare/v3.0.0...v3.0.2) (2016-07-28)


### Bug Fixes

* **commands:** close database connection after commands([8087f10](https://github.com/adonisjs/adonis-lucid/commit/8087f10))
* **migrations:** expose knex.schema via this.schema([4b2828e](https://github.com/adonisjs/adonis-lucid/commit/4b2828e))
* **migrations:** return migrations class body instead of instance([358aeb6](https://github.com/adonisjs/adonis-lucid/commit/358aeb6))
* **pagination:** convert pagination params to safe int([ec7db37](https://github.com/adonisjs/adonis-lucid/commit/ec7db37))
* **postgres:** fix postgres behavior testing for bindings([738db0c](https://github.com/adonisjs/adonis-lucid/commit/738db0c))


### Features

* **factory:** factory blueprint to accept iteration count and custom values([20d5644](https://github.com/adonisjs/adonis-lucid/commit/20d5644))
* **lucid:** add support for firstOrFail([f06e5c1](https://github.com/adonisjs/adonis-lucid/commit/f06e5c1))
* **lucid:** add support for pick,pickInverse and paginate([ef29649](https://github.com/adonisjs/adonis-lucid/commit/ef29649))
* **migrations:** add support for --log flag to log queries to console([f0dfdcb](https://github.com/adonisjs/adonis-lucid/commit/f0dfdcb))



<a name="3.0.1"></a>
## [3.0.1](https://github.com/adonisjs/adonis-lucid/compare/v3.0.0...v3.0.1) (2016-06-26)


### Bug Fixes

* **migrations:** return migrations class body instead of instance([358aeb6](https://github.com/adonisjs/adonis-lucid/commit/358aeb6))



<a name="3.0.0"></a>
# 3.0.0 (2016-06-26)


### Bug Fixes

* **commands:** fix comamnds after ace upgrade([9d12dc9](https://github.com/adonisjs/adonis-lucid/commit/9d12dc9))
* **hooks:** replace .bind with .call([fa3ac36](https://github.com/adonisjs/adonis-lucid/commit/fa3ac36))
* **lucid:** resolve database from IoC container([9ffc658](https://github.com/adonisjs/adonis-lucid/commit/9ffc658))
* **migrations:** allow multiple actions inside a single up/down method [#29](https://github.com/adonisjs/adonis-lucid/issues/29)([6437ee3](https://github.com/adonisjs/adonis-lucid/commit/6437ee3))
* **proxies:** add harmony-reflect to support old node versions with ES6 proxies([1de6e5d](https://github.com/adonisjs/adonis-lucid/commit/1de6e5d))


### Features

* first draft([4eda47c](https://github.com/adonisjs/adonis-lucid/commit/4eda47c))
* **belongsTo:** implement belongsTo relationship([12f83b5](https://github.com/adonisjs/adonis-lucid/commit/12f83b5))
* **belongsToMany:** implement belongsToMany relationship([c4d8812](https://github.com/adonisjs/adonis-lucid/commit/c4d8812))
* **commands:** add basic commands for migrations and seeds([3a9dada](https://github.com/adonisjs/adonis-lucid/commit/3a9dada))
* **commands:** add migrations commands([7bdde0e](https://github.com/adonisjs/adonis-lucid/commit/7bdde0e))
* **commands:** add status command([918768c](https://github.com/adonisjs/adonis-lucid/commit/918768c))
* **database:** add sql event([234df31](https://github.com/adonisjs/adonis-lucid/commit/234df31))
* **factory:** add database factory support([dca2fcd](https://github.com/adonisjs/adonis-lucid/commit/dca2fcd))
* **factory:** make method to return multiple instances([6029f4f](https://github.com/adonisjs/adonis-lucid/commit/6029f4f))
* **hasMany:** implement hasMany relationship([0ae7c8f](https://github.com/adonisjs/adonis-lucid/commit/0ae7c8f))
* **hooks:** add restore hooks support([d9329d8](https://github.com/adonisjs/adonis-lucid/commit/d9329d8))
* **lucid:** add findOrCreate method([5eaf7cc](https://github.com/adonisjs/adonis-lucid/commit/5eaf7cc))
* **lucid:** add support for paginate via model([0bf4f86](https://github.com/adonisjs/adonis-lucid/commit/0bf4f86))
* **lucid:** add support for pluckFirst and pluckId([e3c17d8](https://github.com/adonisjs/adonis-lucid/commit/e3c17d8))
* **lucid-model:** first draft of model implementation([6d4a0ca](https://github.com/adonisjs/adonis-lucid/commit/6d4a0ca))
* **lucid:model:** add createMany method([4f4185c](https://github.com/adonisjs/adonis-lucid/commit/4f4185c))
* **lucid:relations:** add createMany and saveMany methods([a6dce67](https://github.com/adonisjs/adonis-lucid/commit/a6dce67))
* **migrations:** add status method([ec68f1c](https://github.com/adonisjs/adonis-lucid/commit/ec68f1c))
* **migrations,schema:** implement schema and migrations([cc3aac4](https://github.com/adonisjs/adonis-lucid/commit/cc3aac4))
* **package:** integerate semantic-release([0932505](https://github.com/adonisjs/adonis-lucid/commit/0932505))
* **relations:** implement hasManyThrough relationship([2f7466c](https://github.com/adonisjs/adonis-lucid/commit/2f7466c))
* **relationship:** add hasOne relationship([624a7a7](https://github.com/adonisjs/adonis-lucid/commit/624a7a7))
* **seeds:** initiate support for seeds and factories([22e8eb2](https://github.com/adonisjs/adonis-lucid/commit/22e8eb2))
* **tests:** add acceptance tests for model([0e56ed2](https://github.com/adonisjs/adonis-lucid/commit/0e56ed2))
* **util:** add method to make dynamic scopes name([654cbb1](https://github.com/adonisjs/adonis-lucid/commit/654cbb1))
* **util:** add method to pull .js files from a directory([a9dba6a](https://github.com/adonisjs/adonis-lucid/commit/a9dba6a))
* **util:** isolate lodash instance on collection([90a3ba5](https://github.com/adonisjs/adonis-lucid/commit/90a3ba5))



<a name="2.0.5"></a>
## 2.0.5 (2016-01-29)


### Bug Fixes

* removed arrow functions ([45f4740](https://github.com/adonisjs/adonis-lucid/commit/45f4740))
* **model-create:** fixed #16, where returning statement is required for postgres ([fe04529](https://github.com/adonisjs/adonis-lucid/commit/fe04529)), closes [#16](https://github.com/adonisjs/adonis-lucid/issues/16)
* **schema:** Fixed #15 issue to define multiple schema actions ([610bb33](https://github.com/adonisjs/adonis-lucid/commit/610bb33)), closes [#15](https://github.com/adonisjs/adonis-lucid/issues/15)

### Features

* **Integerated commitizen:** package.json ([8c048e8](https://github.com/adonisjs/adonis-lucid/commit/8c048e8))
* **relations:** Added support for multiple relations using lucid orm. ([91d046a](https://github.com/adonisjs/adonis-lucid/commit/91d046a))



<a name="2.0.4"></a>
## 2.0.4 (2016-01-27)


### Bug Fixes

* removed arrow functions ([45f4740](https://github.com/adonisjs/adonis-lucid/commit/45f4740))
* **model-create:** fixed #16, where returning statement is required for postgres ([fe04529](https://github.com/adonisjs/adonis-lucid/commit/fe04529)), closes [#16](https://github.com/adonisjs/adonis-lucid/issues/16)
* **schema:** Fixed #15 issue to define multiple schema actions ([610bb33](https://github.com/adonisjs/adonis-lucid/commit/610bb33)), closes [#15](https://github.com/adonisjs/adonis-lucid/issues/15)

### Features

* **Integerated commitizen:** package.json ([8c048e8](https://github.com/adonisjs/adonis-lucid/commit/8c048e8))
* **relations:** Added support for multiple relations using lucid orm. ([91d046a](https://github.com/adonisjs/adonis-lucid/commit/91d046a))



<a name="2.0.3"></a>
## 2.0.3 (2016-01-16)


* Added .gitkeep to storage folder under unit test ([1607304](https://github.com/adonisjs/adonis-lucid/commit/1607304))
* Added .gitkeep to storage folder under unit test ([1679c23](https://github.com/adonisjs/adonis-lucid/commit/1679c23))
* Added a way to get new query chain when previous query chain is pending ([a43759c](https://github.com/adonisjs/adonis-lucid/commit/a43759c))
* Added belongsTo relation for Lucid models ([feaba58](https://github.com/adonisjs/adonis-lucid/commit/feaba58))
* Added commands to interact with schema and migrations ([5415074](https://github.com/adonisjs/adonis-lucid/commit/5415074))
* Added first basic version of db , requires good amount of refactoring ([95b5013](https://github.com/adonisjs/adonis-lucid/commit/95b5013))
* Added good level of support ([28ac51d](https://github.com/adonisjs/adonis-lucid/commit/28ac51d))
* Added istanbul as dev dependency ([7d8866c](https://github.com/adonisjs/adonis-lucid/commit/7d8866c))
* Added latest version of node to travis build ([ce8bdfb](https://github.com/adonisjs/adonis-lucid/commit/ce8bdfb))
* Added load tests till 10,000 requests ([4000b8d](https://github.com/adonisjs/adonis-lucid/commit/4000b8d))
* Added migrations ([faa8703](https://github.com/adonisjs/adonis-lucid/commit/faa8703))
* Added node latest version to travis file ([94b90fd](https://github.com/adonisjs/adonis-lucid/commit/94b90fd))
* Added peer dependencies to dev dependencies ([326e18c](https://github.com/adonisjs/adonis-lucid/commit/326e18c))
* Added readme ([316a603](https://github.com/adonisjs/adonis-lucid/commit/316a603))
* Added required providers ([afc30e0](https://github.com/adonisjs/adonis-lucid/commit/afc30e0))
* Added standard linting part of npm script ([68a1a60](https://github.com/adonisjs/adonis-lucid/commit/68a1a60))
* Added support for insert/update related models using relationship methods ([6ab0ab2](https://github.com/adonisjs/adonis-lucid/commit/6ab0ab2))
* Added support for multiple associate as per issue #4 ([6aeba8a](https://github.com/adonisjs/adonis-lucid/commit/6aeba8a))
* Added support for nested relations , tested only with hasOne,belongsTo and hasMany ([79a7068](https://github.com/adonisjs/adonis-lucid/commit/79a7068))
* Added support to run queries on related model ([ee148e2](https://github.com/adonisjs/adonis-lucid/commit/ee148e2))
* Added tests for soft deletes with multiple clauses as closures ([4f31aef](https://github.com/adonisjs/adonis-lucid/commit/4f31aef))
* Added travis and coveralls ([7048aed](https://github.com/adonisjs/adonis-lucid/commit/7048aed))
* All tests passing after database provider changes ([710fbaf](https://github.com/adonisjs/adonis-lucid/commit/710fbaf))
* Better coverage of relationships now , also work with model instances. ITS A BREEZE ([3d5bf8a](https://github.com/adonisjs/adonis-lucid/commit/3d5bf8a))
* Closing knex connection after migrations ([9e53e00](https://github.com/adonisjs/adonis-lucid/commit/9e53e00))
* Commands now met their own dependecies ([65cb2ad](https://github.com/adonisjs/adonis-lucid/commit/65cb2ad))
* Corrected config namespace inside runner provider ([b375698](https://github.com/adonisjs/adonis-lucid/commit/b375698))
* Did clean up ace commands ([44af4e3](https://github.com/adonisjs/adonis-lucid/commit/44af4e3))
* Discouraging underscore methods on query scopes ([db965a2](https://github.com/adonisjs/adonis-lucid/commit/db965a2))
* Exposed schema and runner classes via providers ([3414503](https://github.com/adonisjs/adonis-lucid/commit/3414503))
* Fix typo inside hijaker.all method ([0bc5db3](https://github.com/adonisjs/adonis-lucid/commit/0bc5db3))
* Fixed belongsToMany issue #7 ([dc0f5fa](https://github.com/adonisjs/adonis-lucid/commit/dc0f5fa)), closes [#7](https://github.com/adonisjs/adonis-lucid/issues/7)
* Fixed breaking tests after last commit ([539d46c](https://github.com/adonisjs/adonis-lucid/commit/539d46c))
* Fixed bugs defined in #12 ([2ef69f8](https://github.com/adonisjs/adonis-lucid/commit/2ef69f8)), closes [#12](https://github.com/adonisjs/adonis-lucid/issues/12)
* Fixed config key ([d5b54e1](https://github.com/adonisjs/adonis-lucid/commit/d5b54e1))
* Forcing travis to rebuild gcc ([9092a1f](https://github.com/adonisjs/adonis-lucid/commit/9092a1f))
* Formatted source files ([03c51da](https://github.com/adonisjs/adonis-lucid/commit/03c51da))
* Formatted source files ([6de0248](https://github.com/adonisjs/adonis-lucid/commit/6de0248))
* formatted src files ([fe1a8e1](https://github.com/adonisjs/adonis-lucid/commit/fe1a8e1))
* Formatted src files ([b7bf23e](https://github.com/adonisjs/adonis-lucid/commit/b7bf23e))
* hasOne,hasMany,belongsTo,belongsToMany relations implemented ([17061e8](https://github.com/adonisjs/adonis-lucid/commit/17061e8))
* Implementation tests are passing ([83658e1](https://github.com/adonisjs/adonis-lucid/commit/83658e1))
* Improved tests for database and migrations command ([0e57b3c](https://github.com/adonisjs/adonis-lucid/commit/0e57b3c))
* Made all providers fold 2.0 compatable ([978aba1](https://github.com/adonisjs/adonis-lucid/commit/978aba1))
* Made changes required by latest version of ace ([9092a4e](https://github.com/adonisjs/adonis-lucid/commit/9092a4e))
* Made database access part of constructor inside static proxy ([49538bc](https://github.com/adonisjs/adonis-lucid/commit/49538bc))
* Made flags optional and minor formatting update ([49aef82](https://github.com/adonisjs/adonis-lucid/commit/49aef82))
* Made upto date as master ([bf46e3c](https://github.com/adonisjs/adonis-lucid/commit/bf46e3c))
* Merge branch 'release-2.0.1' into develop ([b516bf9](https://github.com/adonisjs/adonis-lucid/commit/b516bf9))
* Merge branch 'release-2.0.2' into develop ([f841752](https://github.com/adonisjs/adonis-lucid/commit/f841752))
* Merged clean-up ([3499ba3](https://github.com/adonisjs/adonis-lucid/commit/3499ba3))
* Merged feature schema ([d420697](https://github.com/adonisjs/adonis-lucid/commit/d420697))
* Merged feature upgrade ([cf21fd8](https://github.com/adonisjs/adonis-lucid/commit/cf21fd8))
* Merged fix-migrations-test-issue ([e1a6155](https://github.com/adonisjs/adonis-lucid/commit/e1a6155))
* Merged improving-tests ([1df14a7](https://github.com/adonisjs/adonis-lucid/commit/1df14a7))
* Merged release 2.0 ([3b6dc8a](https://github.com/adonisjs/adonis-lucid/commit/3b6dc8a))
* Merged simplify-commands ([01676b4](https://github.com/adonisjs/adonis-lucid/commit/01676b4))
* Merged swapping-commands-dependencies ([b744a64](https://github.com/adonisjs/adonis-lucid/commit/b744a64))
* Models with static and instance methods are working ([4d5467b](https://github.com/adonisjs/adonis-lucid/commit/4d5467b))
* Moved migrations dir creation to before ook ([b864471](https://github.com/adonisjs/adonis-lucid/commit/b864471))
* not hijacking then method anymore , it causes issues while creating records ([9fd225c](https://github.com/adonisjs/adonis-lucid/commit/9fd225c))
* Now commands are exported objects instead of classes ([3500fe8](https://github.com/adonisjs/adonis-lucid/commit/3500fe8))
* Now find method also mutate values ([03fc3eb](https://github.com/adonisjs/adonis-lucid/commit/03fc3eb))
* Now query scopes also accepts parameters ([33e1175](https://github.com/adonisjs/adonis-lucid/commit/33e1175))
* npm version bumo ([56e668c](https://github.com/adonisjs/adonis-lucid/commit/56e668c))
* npm version bump ([c9535a8](https://github.com/adonisjs/adonis-lucid/commit/c9535a8))
* npm version bump ([389f9c9](https://github.com/adonisjs/adonis-lucid/commit/389f9c9))
* npm version bump ([fc1183b](https://github.com/adonisjs/adonis-lucid/commit/fc1183b))
* npm version bump ([f51b2e8](https://github.com/adonisjs/adonis-lucid/commit/f51b2e8))
* npm version bump ([ca02321](https://github.com/adonisjs/adonis-lucid/commit/ca02321))
* npm version bump for release ([56c38d9](https://github.com/adonisjs/adonis-lucid/commit/56c38d9))
* npm version bump for release ([c584d71](https://github.com/adonisjs/adonis-lucid/commit/c584d71))
* Place requires inside providers register method ([cfe08b0](https://github.com/adonisjs/adonis-lucid/commit/cfe08b0))
* post test sqlite changes ([cb5e55b](https://github.com/adonisjs/adonis-lucid/commit/cb5e55b))
* Providers now returns the actual class instead of instance ([de99f99](https://github.com/adonisjs/adonis-lucid/commit/de99f99))
* Remove iojs from travis ([45ffd77](https://github.com/adonisjs/adonis-lucid/commit/45ffd77))
* Removed cz changelog and referencing fold from npm ([6ae14d2](https://github.com/adonisjs/adonis-lucid/commit/6ae14d2))
* Removed direct depdencies from database ([86a4b69](https://github.com/adonisjs/adonis-lucid/commit/86a4b69))
* removed unwanted test ([f39f707](https://github.com/adonisjs/adonis-lucid/commit/f39f707))
* Scope methods are working fine ([7b39722](https://github.com/adonisjs/adonis-lucid/commit/7b39722))
* semi formatted test files ([9d3e14f](https://github.com/adonisjs/adonis-lucid/commit/9d3e14f))
* Single rows returns object not array ([29fccea](https://github.com/adonisjs/adonis-lucid/commit/29fccea))
* Still adding relations support with stable api ([aba03f1](https://github.com/adonisjs/adonis-lucid/commit/aba03f1))
* test changes ([d5b00cb](https://github.com/adonisjs/adonis-lucid/commit/d5b00cb))
* Tested model constraints when pulling up relations ([315b5d7](https://github.com/adonisjs/adonis-lucid/commit/315b5d7))
* Updated all tests to create and delete database files ([9e4396f](https://github.com/adonisjs/adonis-lucid/commit/9e4396f))
* Updated config provider namespace ([f74383b](https://github.com/adonisjs/adonis-lucid/commit/f74383b))
* Updated depdencies , replace fold with adonis-fold ([efe3d2e](https://github.com/adonisjs/adonis-lucid/commit/efe3d2e))
* Updated dependencies ([dc1ce1e](https://github.com/adonisjs/adonis-lucid/commit/dc1ce1e))
* Updated migrations commands output ([d5ebb69](https://github.com/adonisjs/adonis-lucid/commit/d5ebb69))
* Updated package name ([9f75969](https://github.com/adonisjs/adonis-lucid/commit/9f75969))
* Using sqlite directly from npm ([704d76d](https://github.com/adonisjs/adonis-lucid/commit/704d76d))
* Wohoo over 95% coverage ([0baf0cf](https://github.com/adonisjs/adonis-lucid/commit/0baf0cf))

### feat

* feat(Integerated commitizen): package.json ([8c048e8](https://github.com/adonisjs/adonis-lucid/commit/8c048e8))
* feat(relations): Added support for multiple relations using lucid orm. ([91d046a](https://github.com/adonisjs/adonis-lucid/commit/91d046a))

### fix

* fix(): removed arrow functions ([45f4740](https://github.com/adonisjs/adonis-lucid/commit/45f4740))
* fix(schema): Fixed #15 issue to define multiple schema actions ([610bb33](https://github.com/adonisjs/adonis-lucid/commit/610bb33)), closes [#15](https://github.com/adonisjs/adonis-lucid/issues/15)

### refactor

* refactor(): refactored code for readability ([6e526a1](https://github.com/adonisjs/adonis-lucid/commit/6e526a1))



<a name="5.0.3"></a>
## [5.0.3](https://github.com/adonisjs/adonis-lucid/compare/v5.0.2...v5.0.3) (2018-02-23)



<a name="5.0.2"></a>
## [5.0.2](https://github.com/adonisjs/adonis-lucid/compare/v5.0.1...v5.0.2) (2018-02-09)


### Bug Fixes

* **querybuilder:** pass builder to formatter instance ([882e1cb](https://github.com/adonisjs/adonis-lucid/commit/882e1cb)), closes [#294](https://github.com/adonisjs/adonis-lucid/issues/294)



<a name="5.0.1"></a>
## [5.0.1](https://github.com/adonisjs/adonis-lucid/compare/v5.0.0...v5.0.1) (2018-02-07)



<a name="5.0.0"></a>
# [5.0.0](https://github.com/adonisjs/adonis-lucid/compare/v4.1.3...v5.0.0) (2018-01-31)


### Bug Fixes

* **belongsToMany:** apply pivotModel global scopes when defined ([4de8b0f](https://github.com/adonisjs/adonis-lucid/commit/4de8b0f)), closes [#261](https://github.com/adonisjs/adonis-lucid/issues/261)
* **lucid:** format dates on newly create instance ([69a8da6](https://github.com/adonisjs/adonis-lucid/commit/69a8da6)), closes [#245](https://github.com/adonisjs/adonis-lucid/issues/245)
* **schema:** fix issue around chaining `withSchema` ([f03c6b7](https://github.com/adonisjs/adonis-lucid/commit/f03c6b7)), closes [#282](https://github.com/adonisjs/adonis-lucid/issues/282)
* **tests:** fix breaking tests in mysql & pg ([a59326c](https://github.com/adonisjs/adonis-lucid/commit/a59326c))


### BREAKING CHANGES

* **lucid:** If you have accessed the date properties directly on the model instance, then they
will be string over moment instance now



<a name="4.1.3"></a>
## [4.1.3](https://github.com/adonisjs/adonis-lucid/compare/v4.1.2...v4.1.3) (2018-01-21)


### Features

* **config:** add sample config file inside config dir ([c62bd5d](https://github.com/adonisjs/adonis-lucid/commit/c62bd5d))
* **schema:** add schedule method to run arbitrary db commands ([fd225d8](https://github.com/adonisjs/adonis-lucid/commit/fd225d8)), closes [#53](https://github.com/adonisjs/adonis-lucid/issues/53)



<a name="4.1.2"></a>
## [4.1.2](https://github.com/adonisjs/adonis-lucid/compare/v4.1.1...v4.1.2) (2018-01-08)


### Bug Fixes

* use Array.isArray of instanceof ([892208b](https://github.com/adonisjs/adonis-lucid/commit/892208b)), closes [#262](https://github.com/adonisjs/adonis-lucid/issues/262)
* **belongstomany:** add transaction support to attach,detach & sync ([d6fa6aa](https://github.com/adonisjs/adonis-lucid/commit/d6fa6aa)), closes [#244](https://github.com/adonisjs/adonis-lucid/issues/244)
* **belongsToMany:** pick value of define key over primaryKeyValue ([7116c2b](https://github.com/adonisjs/adonis-lucid/commit/7116c2b)), closes [#246](https://github.com/adonisjs/adonis-lucid/issues/246)
* **belongsToMany:** pivotModel should allow class and ioc container string ([80fc99c](https://github.com/adonisjs/adonis-lucid/commit/80fc99c)), closes [#254](https://github.com/adonisjs/adonis-lucid/issues/254)
* **database:** database.close should remove connection on close ([874268a](https://github.com/adonisjs/adonis-lucid/commit/874268a))
* **eagerloading:** fetch all nested relations ([#273](https://github.com/adonisjs/adonis-lucid/issues/273)) ([1a796cd](https://github.com/adonisjs/adonis-lucid/commit/1a796cd))
* **querybuilder:** apply scopes for all query methods ([97bd2c3](https://github.com/adonisjs/adonis-lucid/commit/97bd2c3))
* **querybuilder:** where closure should have model qb scope ([d52aa8d](https://github.com/adonisjs/adonis-lucid/commit/d52aa8d)), closes [#267](https://github.com/adonisjs/adonis-lucid/issues/267)
* **queryscopes:** ensure query scopes are called with relations too ([4d25fcc](https://github.com/adonisjs/adonis-lucid/commit/4d25fcc)), closes [#261](https://github.com/adonisjs/adonis-lucid/issues/261)
* **relations:** only ignore undefined and null values ([1f852be](https://github.com/adonisjs/adonis-lucid/commit/1f852be)), closes [#272](https://github.com/adonisjs/adonis-lucid/issues/272)
* **schema:** add withSchema method to the schema builder ([5703a7c](https://github.com/adonisjs/adonis-lucid/commit/5703a7c))
* **serializer:** resolve serializer return string via ioc container ([484a6c1](https://github.com/adonisjs/adonis-lucid/commit/484a6c1)), closes [#268](https://github.com/adonisjs/adonis-lucid/issues/268)
* **whereRaw:** where raw formatter dot notated fields ([c7df200](https://github.com/adonisjs/adonis-lucid/commit/c7df200)), closes [#252](https://github.com/adonisjs/adonis-lucid/issues/252)


### Features

* **lucid:** allow to unfreeze model instance ([#266](https://github.com/adonisjs/adonis-lucid/issues/266)) ([1cacc58](https://github.com/adonisjs/adonis-lucid/commit/1cacc58))
* **seed:** auto close db on when seeder finishes ([edd7640](https://github.com/adonisjs/adonis-lucid/commit/edd7640))



<a name="4.1.1"></a>
## [4.1.1](https://github.com/adonisjs/adonis-lucid/compare/v4.1.0...v4.1.1) (2017-12-12)


### Bug Fixes

* **belongsToMany:** typo in relation added methods on base relation ([e902760](https://github.com/adonisjs/adonis-lucid/commit/e902760)), closes [#258](https://github.com/adonisjs/adonis-lucid/issues/258)



<a name="4.1.0"></a>
# [4.1.0](https://github.com/adonisjs/adonis-lucid/compare/v4.0.25...v4.1.0) (2017-12-07)


### Bug Fixes

* **eagerloading:** eagerloading with .first should behave same as .fetch ([9bcb09d](https://github.com/adonisjs/adonis-lucid/commit/9bcb09d))


### Features

* **addHook:** accept an array of hooks too ([6abaa6a](https://github.com/adonisjs/adonis-lucid/commit/6abaa6a))
* **addHook:** return this to keep api chainable ([b5a9ef9](https://github.com/adonisjs/adonis-lucid/commit/b5a9ef9))
* **belongstomany:** add sync method ([eea84ad](https://github.com/adonisjs/adonis-lucid/commit/eea84ad))



<a name="4.0.25"></a>
## [4.0.25](https://github.com/adonisjs/adonis-lucid/compare/v4.0.24...v4.0.25) (2017-12-06)


### Bug Fixes

* **migrations:** add deferred action for raw method ([#251](https://github.com/adonisjs/adonis-lucid/issues/251)) ([c2b1f3d](https://github.com/adonisjs/adonis-lucid/commit/c2b1f3d))



<a name="4.0.24"></a>
## [4.0.24](https://github.com/adonisjs/adonis-lucid/compare/v4.0.23...v4.0.24) (2017-11-22)


### Bug Fixes

* **lucid:** on save retain timestamps inside memory ([4f0c035](https://github.com/adonisjs/adonis-lucid/commit/4f0c035)), closes [#235](https://github.com/adonisjs/adonis-lucid/issues/235)
* **relations:** changed method _normalizeRelations ([b085f8a](https://github.com/adonisjs/adonis-lucid/commit/b085f8a))
* **relations:** parse relations array ([3cea702](https://github.com/adonisjs/adonis-lucid/commit/3cea702))
* **test:** remove followers table on tear down ([fe69ed2](https://github.com/adonisjs/adonis-lucid/commit/fe69ed2))
* **tests:** test fixes for postgresql ([27ac971](https://github.com/adonisjs/adonis-lucid/commit/27ac971))


### Features

* **database:** add aggregation helpers ([10023f7](https://github.com/adonisjs/adonis-lucid/commit/10023f7))
* **lucid:** add afterPaginate hook ([f12d8a5](https://github.com/adonisjs/adonis-lucid/commit/f12d8a5)), closes [#236](https://github.com/adonisjs/adonis-lucid/issues/236)
* **lucid:** add Model.truncate() function ([#240](https://github.com/adonisjs/adonis-lucid/issues/240)) ([9be15a9](https://github.com/adonisjs/adonis-lucid/commit/9be15a9))
* **migrations:** introduce a silent flag to silent the output ([c16abb8](https://github.com/adonisjs/adonis-lucid/commit/c16abb8))
* **query-builder:** add last method  ([#232](https://github.com/adonisjs/adonis-lucid/issues/232)) ([01a6fa7](https://github.com/adonisjs/adonis-lucid/commit/01a6fa7))



<a name="4.0.23"></a>
## [4.0.23](https://github.com/adonisjs/adonis-lucid/compare/v4.0.22...v4.0.23) (2017-11-13)


### Bug Fixes

* **relations:** fix withCount query for self joins ([8b51561](https://github.com/adonisjs/adonis-lucid/commit/8b51561)), closes [#231](https://github.com/adonisjs/adonis-lucid/issues/231)


### Features

* **serializer:** add nth method to pull row for specific index ([e578eeb](https://github.com/adonisjs/adonis-lucid/commit/e578eeb))



<a name="4.0.22"></a>
## [4.0.22](https://github.com/adonisjs/adonis-lucid/compare/v4.0.21...v4.0.22) (2017-11-08)


### Bug Fixes

* **belongsToMany:** do not select all fields for aggregates ([5e58e38](https://github.com/adonisjs/adonis-lucid/commit/5e58e38)), closes [#216](https://github.com/adonisjs/adonis-lucid/issues/216)
* **schema:** this.raw should reference this.schema.raw ([dcfc265](https://github.com/adonisjs/adonis-lucid/commit/dcfc265)), closes [#212](https://github.com/adonisjs/adonis-lucid/issues/212)


### Features

* **belongsToMany:** add countDistinct method ([#224](https://github.com/adonisjs/adonis-lucid/issues/224)) ([26cca0e](https://github.com/adonisjs/adonis-lucid/commit/26cca0e))
* **traits:** allow user to pass options to `addTrait` ([be987ca](https://github.com/adonisjs/adonis-lucid/commit/be987ca))



<a name="4.0.21"></a>
## [4.0.21](https://github.com/adonisjs/adonis-lucid/compare/v4.0.20...v4.0.21) (2017-10-29)


### Bug Fixes

* **database:** add database.transaction method ([56695d7](https://github.com/adonisjs/adonis-lucid/commit/56695d7)), closes [#184](https://github.com/adonisjs/adonis-lucid/issues/184)
* **factory:** await dataCallback to get results ([045d587](https://github.com/adonisjs/adonis-lucid/commit/045d587))
* **factory:** pass index to create/make many ([9cc69aa](https://github.com/adonisjs/adonis-lucid/commit/9cc69aa)), closes [#195](https://github.com/adonisjs/adonis-lucid/issues/195)
* **schema:** add alias to createTableIfNotExists ([#190](https://github.com/adonisjs/adonis-lucid/issues/190)) ([1ce3d72](https://github.com/adonisjs/adonis-lucid/commit/1ce3d72))
* **seed:** seed only js files ([#186](https://github.com/adonisjs/adonis-lucid/issues/186)) ([0496411](https://github.com/adonisjs/adonis-lucid/commit/0496411))
* **seed:** typo in seed command ([#193](https://github.com/adonisjs/adonis-lucid/issues/193)) ([d99ec4f](https://github.com/adonisjs/adonis-lucid/commit/d99ec4f))


### Features

* **extension:** add extension methods to schema ([71fb268](https://github.com/adonisjs/adonis-lucid/commit/71fb268))
* **lucid:** add merge method to model instance ([#188](https://github.com/adonisjs/adonis-lucid/issues/188)) ([ab31b4c](https://github.com/adonisjs/adonis-lucid/commit/ab31b4c))



<a name="4.0.20"></a>
## [4.0.20](https://github.com/adonisjs/adonis-lucid/compare/v4.0.19...v4.0.20) (2017-10-03)


### Bug Fixes

* **migrations:** use hasTable and createTable ([f12d51b](https://github.com/adonisjs/adonis-lucid/commit/f12d51b)), closes [#172](https://github.com/adonisjs/adonis-lucid/issues/172)
* **schema:** raw method should be knex.raw ([8cae109](https://github.com/adonisjs/adonis-lucid/commit/8cae109)), closes [#181](https://github.com/adonisjs/adonis-lucid/issues/181)



<a name="4.0.19"></a>
## [4.0.19](https://github.com/adonisjs/adonis-lucid/compare/v4.0.18...v4.0.19) (2017-10-01)


### Bug Fixes

* **migration:** make table when getting migration status ([ac33a52](https://github.com/adonisjs/adonis-lucid/commit/ac33a52))
* **migration:status:** set batch to empty string over null ([7ebca55](https://github.com/adonisjs/adonis-lucid/commit/7ebca55))


### BREAKING CHANGES

* **migration:status:** Closes #180



<a name="4.0.18"></a>
## [4.0.18](https://github.com/adonisjs/adonis-lucid/compare/v4.0.17...v4.0.18) (2017-09-25)


### Features

* **eagerloading:** allow custom fn for eagerload query ([da1b71e](https://github.com/adonisjs/adonis-lucid/commit/da1b71e))



<a name="4.0.17"></a>
## [4.0.17](https://github.com/adonisjs/adonis-lucid/compare/v4.0.16...v4.0.17) (2017-09-08)


### Bug Fixes

* **belongsTo:** ignore null bindings when eagerloading ([c3b5da3](https://github.com/adonisjs/adonis-lucid/commit/c3b5da3))


### Features

* **lucid:** add findOrCreate & findOrNew methods ([cd6041d](https://github.com/adonisjs/adonis-lucid/commit/cd6041d))



<a name="4.0.16"></a>
## [4.0.16](https://github.com/adonisjs/adonis-lucid/compare/v4.0.15...v4.0.16) (2017-08-30)


### Bug Fixes

* **package:** update debug to version 3.0.1 ([#166](https://github.com/adonisjs/adonis-lucid/issues/166)) ([51965df](https://github.com/adonisjs/adonis-lucid/commit/51965df))
* **trait:** add await to beginGlobalTransaction ([8280e55](https://github.com/adonisjs/adonis-lucid/commit/8280e55))


### Features

* **factory:** add faker methods for username & password ([1333862](https://github.com/adonisjs/adonis-lucid/commit/1333862))



<a name="4.0.15"></a>
## [4.0.15](https://github.com/adonisjs/adonis-lucid/compare/v4.0.14...v4.0.15) (2017-08-22)


### Features

* **validation:** add unique validation rule for validator ([74a9a3e](https://github.com/adonisjs/adonis-lucid/commit/74a9a3e))



<a name="4.0.14"></a>
## [4.0.14](https://github.com/adonisjs/adonis-lucid/compare/v4.0.13...v4.0.14) (2017-08-22)


### Bug Fixes

* **package:** update pluralize to version 7.0.0 ([#162](https://github.com/adonisjs/adonis-lucid/issues/162)) ([7723779](https://github.com/adonisjs/adonis-lucid/commit/7723779))


### Features

* **hooks:** add afterFetch hook ([941986e](https://github.com/adonisjs/adonis-lucid/commit/941986e))



<a name="4.0.13"></a>
## [4.0.13](https://github.com/adonisjs/adonis-lucid/compare/v4.0.12...v4.0.13) (2017-08-18)


### Features

* **model:** allow query level fields filtering ([8fc559d](https://github.com/adonisjs/adonis-lucid/commit/8fc559d))
* **relations:** add andWherePivot in belongs to many ([e0f0c6a](https://github.com/adonisjs/adonis-lucid/commit/e0f0c6a))
* **traits:** add database transactions trait ([bd4c8bb](https://github.com/adonisjs/adonis-lucid/commit/bd4c8bb))



<a name="4.0.12"></a>
## [4.0.12](https://github.com/adonisjs/adonis-lucid/compare/v4.0.11...v4.0.12) (2017-08-16)


### Bug Fixes

* **relations:** relation parser set nested relations on demand ([48bdbba](https://github.com/adonisjs/adonis-lucid/commit/48bdbba))
* **relations:** resolve relation ioc binding before hand ([713b55f](https://github.com/adonisjs/adonis-lucid/commit/713b55f)), closes [#161](https://github.com/adonisjs/adonis-lucid/issues/161)



<a name="4.0.11"></a>
## [4.0.11](https://github.com/adonisjs/adonis-lucid/compare/v4.0.10...v4.0.11) (2017-08-15)


### Bug Fixes

* **database:** database.on bind events on knex and not query ([948d05b](https://github.com/adonisjs/adonis-lucid/commit/948d05b))
* **lucid:** call afterFind hook via await keyword ([c4de51d](https://github.com/adonisjs/adonis-lucid/commit/c4de51d))
* **package:** add missing dependencies ([5e7e304](https://github.com/adonisjs/adonis-lucid/commit/5e7e304))


### Features

* **commands:** add migration:status command ([a6bc882](https://github.com/adonisjs/adonis-lucid/commit/a6bc882))
* **lucid:** add support for transactions in save operations ([687de3c](https://github.com/adonisjs/adonis-lucid/commit/687de3c))



<a name="4.0.10"></a>
## [4.0.10](https://github.com/adonisjs/adonis-lucid/compare/v4.0.8...v4.0.10) (2017-08-05)


### Bug Fixes

* **provider:** load migration:reset command too ([7afdc62](https://github.com/adonisjs/adonis-lucid/commit/7afdc62))


### Features

* **exceptions:** use generic-exceptions module ([d3daecc](https://github.com/adonisjs/adonis-lucid/commit/d3daecc))
* **lucid:** add support for model instance reload ([87569b1](https://github.com/adonisjs/adonis-lucid/commit/87569b1))



<a name="4.0.9"></a>
## [4.0.9](https://github.com/adonisjs/adonis-lucid/compare/v4.0.8...v4.0.9) (2017-08-02)


### Features

* **exceptions:** use generic-exceptions module ([d3daecc](https://github.com/adonisjs/adonis-lucid/commit/d3daecc))



<a name="4.0.8"></a>
## [4.0.8](https://github.com/adonisjs/adonis-lucid/compare/v4.0.7...v4.0.8) (2017-08-01)


### Bug Fixes

* **test:** remove clear require from tests ([b120aa4](https://github.com/adonisjs/adonis-lucid/commit/b120aa4))


### Features

* **commands:** add seed time to seed command ([98626f3](https://github.com/adonisjs/adonis-lucid/commit/98626f3))
* **commands:** log migration time next to command ([63339fb](https://github.com/adonisjs/adonis-lucid/commit/63339fb))



<a name="4.0.7"></a>
## [4.0.7](https://github.com/adonisjs/adonis-lucid/compare/v4.0.6...v4.0.7) (2017-08-01)



<a name="4.0.6"></a>
## [4.0.6](https://github.com/adonisjs/adonis-lucid/compare/v4.0.5...v4.0.6) (2017-08-01)


### Features

* **commands:** add seed command ([dd56409](https://github.com/adonisjs/adonis-lucid/commit/dd56409))
* **instructions:** add instructions file ([a1086d9](https://github.com/adonisjs/adonis-lucid/commit/a1086d9))


### Reverts

* **commands:** remove config:database command ([0671c56](https://github.com/adonisjs/adonis-lucid/commit/0671c56))



<a name="4.0.5"></a>
## [4.0.5](https://github.com/adonisjs/adonis-lucid/compare/v4.0.4...v4.0.5) (2017-07-30)


### Bug Fixes

* **hooks:** fix bad validation behavior ([1b3a0d5](https://github.com/adonisjs/adonis-lucid/commit/1b3a0d5))


### Features

* **commands:** add config:database command ([98a318a](https://github.com/adonisjs/adonis-lucid/commit/98a318a))



<a name="4.0.4"></a>
## [4.0.4](https://github.com/adonisjs/adonis-lucid/compare/v4.0.3...v4.0.4) (2017-07-30)


### Bug Fixes

* **model:** set makePlain getter for ioc container ([40b3e85](https://github.com/adonisjs/adonis-lucid/commit/40b3e85))


### Features

* **migration:** remove migration:make command ([0a97527](https://github.com/adonisjs/adonis-lucid/commit/0a97527))



<a name="4.0.3"></a>
## [4.0.3](https://github.com/adonisjs/adonis-lucid/compare/v4.0.2...v4.0.3) (2017-07-17)


### Bug Fixes

* **proxy:** handle proxy inspection properly ([c8ab664](https://github.com/adonisjs/adonis-lucid/commit/c8ab664))



<a name="4.0.2"></a>
## [4.0.2](https://github.com/adonisjs/adonis-lucid/compare/v4.0.1...v4.0.2) (2017-07-16)


### Features

* **providers:** register commands inside ioc container ([40ce930](https://github.com/adonisjs/adonis-lucid/commit/40ce930))



<a name="4.0.1"></a>
## [4.0.1](https://github.com/adonisjs/adonis-lucid/compare/v4.0.0...v4.0.1) (2017-07-16)


### Features

* **commands:** add make,refresh and reset commands ([7d32b74](https://github.com/adonisjs/adonis-lucid/commit/7d32b74))
* **commands:** add migration:run command ([02fce82](https://github.com/adonisjs/adonis-lucid/commit/02fce82))
* **commands:** implement migration:rollback ([6181459](https://github.com/adonisjs/adonis-lucid/commit/6181459))



<a name="4.0.0"></a>
# 4.0.0 (2017-07-16)


### Bug Fixes

* **commands:** close database connection after commands ([4ad9402](https://github.com/adonisjs/adonis-lucid/commit/4ad9402))
* **commands:** fix comamnds after ace upgrade ([82e6060](https://github.com/adonisjs/adonis-lucid/commit/82e6060))
* **database:** close db connection on test suite end ([82825dd](https://github.com/adonisjs/adonis-lucid/commit/82825dd))
* **database:** paginate count query to ignore order by ([776958c](https://github.com/adonisjs/adonis-lucid/commit/776958c)), closes [#64](https://github.com/adonisjs/adonis-lucid/issues/64)
* **database:** rename pluck to pluckAll ([2ef7d54](https://github.com/adonisjs/adonis-lucid/commit/2ef7d54)), closes [#81](https://github.com/adonisjs/adonis-lucid/issues/81)
* **db:seed:** make sure --files accept value ([cefb9a9](https://github.com/adonisjs/adonis-lucid/commit/cefb9a9))
* **hooks:** hooks can be binded as ioc bindings ([46498e8](https://github.com/adonisjs/adonis-lucid/commit/46498e8))
* **hooks:** replace .bind with .call ([e398848](https://github.com/adonisjs/adonis-lucid/commit/e398848))
* **lucid:** consider dirty values after beforeHooks ([b8614bd](https://github.com/adonisjs/adonis-lucid/commit/b8614bd)), closes [#44](https://github.com/adonisjs/adonis-lucid/issues/44)
* **lucid:** resolve database from IoC container ([7563b8e](https://github.com/adonisjs/adonis-lucid/commit/7563b8e))
* **lucid:** use primary key instead of id ([ba39a06](https://github.com/adonisjs/adonis-lucid/commit/ba39a06)), closes [#51](https://github.com/adonisjs/adonis-lucid/issues/51)
* **lucid:relations:** implement delete method to delete relations ([97291c9](https://github.com/adonisjs/adonis-lucid/commit/97291c9)), closes [#63](https://github.com/adonisjs/adonis-lucid/issues/63)
* **lucid:relations:** keep relation output consistent ([0986fc9](https://github.com/adonisjs/adonis-lucid/commit/0986fc9)), closes [#45](https://github.com/adonisjs/adonis-lucid/issues/45)
* **migration:** ignore prefixing inside migrations ([962016c](https://github.com/adonisjs/adonis-lucid/commit/962016c)), closes [#105](https://github.com/adonisjs/adonis-lucid/issues/105)
* **migrations:** add order by clause ([fac39bf](https://github.com/adonisjs/adonis-lucid/commit/fac39bf))
* **migrations:** allow multiple actions inside a single up/down method [#29](https://github.com/adonisjs/adonis-lucid/issues/29) ([9105c35](https://github.com/adonisjs/adonis-lucid/commit/9105c35))
* **migrations:** expose knex.schema via this.schema ([5a93394](https://github.com/adonisjs/adonis-lucid/commit/5a93394))
* **migrations:** fix migrations log output ([1571176](https://github.com/adonisjs/adonis-lucid/commit/1571176))
* **migrations:** make sure schema callback is function before executing ([5aa9897](https://github.com/adonisjs/adonis-lucid/commit/5aa9897)), closes [#60](https://github.com/adonisjs/adonis-lucid/issues/60)
* **migrations:** return migrations class body instead of instance ([5e473bf](https://github.com/adonisjs/adonis-lucid/commit/5e473bf))
* **migrations:** select column as {name} ([7bda1b8](https://github.com/adonisjs/adonis-lucid/commit/7bda1b8)), closes [#82](https://github.com/adonisjs/adonis-lucid/issues/82)
* **postgres:** fix postgres behavior testing for bindings ([490e1e2](https://github.com/adonisjs/adonis-lucid/commit/490e1e2))
* **proxies:** add harmony-reflect to support old node versions with ES6 proxies ([ba9f124](https://github.com/adonisjs/adonis-lucid/commit/ba9f124))
* **query:** withCount existing columns r preserved ([9cd0683](https://github.com/adonisjs/adonis-lucid/commit/9cd0683))
* **relation:** make sure query.first eagerloads ([7cc36c3](https://github.com/adonisjs/adonis-lucid/commit/7cc36c3))
* **soft-deletes:** pairs and ids ignore soft deleted ([0530d59](https://github.com/adonisjs/adonis-lucid/commit/0530d59)), closes [#109](https://github.com/adonisjs/adonis-lucid/issues/109)
* **util:** filter .js files before requiring them ([22b578c](https://github.com/adonisjs/adonis-lucid/commit/22b578c)), closes [#96](https://github.com/adonisjs/adonis-lucid/issues/96)


### Features

* add support for named exceptions ([fe26020](https://github.com/adonisjs/adonis-lucid/commit/fe26020))
* first draft ([e1916ae](https://github.com/adonisjs/adonis-lucid/commit/e1916ae))
* remove dependency from ioc container ([7478cda](https://github.com/adonisjs/adonis-lucid/commit/7478cda))
* **belongsTo:** implement belongsTo relationship ([03abc25](https://github.com/adonisjs/adonis-lucid/commit/03abc25))
* **belongsToMany:** implement belongsToMany relationship ([79ff193](https://github.com/adonisjs/adonis-lucid/commit/79ff193))
* **commands:** add basic commands for migrations and seeds ([6515565](https://github.com/adonisjs/adonis-lucid/commit/6515565))
* **commands:** add migrations commands ([2d9ac8f](https://github.com/adonisjs/adonis-lucid/commit/2d9ac8f))
* **commands:** add status command ([dd890d3](https://github.com/adonisjs/adonis-lucid/commit/dd890d3))
* **commands:** seed db inside run and refresh command ([4c7ec06](https://github.com/adonisjs/adonis-lucid/commit/4c7ec06))
* **create:** add create method ([87b7596](https://github.com/adonisjs/adonis-lucid/commit/87b7596))
* **database:** add support for table prefixing ([2557786](https://github.com/adonisjs/adonis-lucid/commit/2557786)), closes [#58](https://github.com/adonisjs/adonis-lucid/issues/58)
* **database:** implement close method ([74bdfcd](https://github.com/adonisjs/adonis-lucid/commit/74bdfcd))
* **databse:** add database and query builder ([00f091d](https://github.com/adonisjs/adonis-lucid/commit/00f091d))
* **factory:** add database factory ([4a574ea](https://github.com/adonisjs/adonis-lucid/commit/4a574ea))
* **factory:** add reset method on model factory ([dfde978](https://github.com/adonisjs/adonis-lucid/commit/dfde978))
* **factory:** define model,database blueprints for seeding ([092ccbd](https://github.com/adonisjs/adonis-lucid/commit/092ccbd))
* **factory:** factory blueprint to accept iteration count and custom values ([01aff71](https://github.com/adonisjs/adonis-lucid/commit/01aff71))
* **hasMany:** add create, save method ([d0e1534](https://github.com/adonisjs/adonis-lucid/commit/d0e1534))
* **hasOne:** add support for create and save ([c587c1d](https://github.com/adonisjs/adonis-lucid/commit/c587c1d))
* **hasOne:** createMany and saveMany throws verbose exceptions ([c2f0b65](https://github.com/adonisjs/adonis-lucid/commit/c2f0b65))
* **hooks:** add restore hooks support ([c8ca6b1](https://github.com/adonisjs/adonis-lucid/commit/c8ca6b1))
* **lucid:** add $parent property on model ([1f8a4c5](https://github.com/adonisjs/adonis-lucid/commit/1f8a4c5))
* **lucid:** add aggregates on relationship ([d614c96](https://github.com/adonisjs/adonis-lucid/commit/d614c96)), closes [#48](https://github.com/adonisjs/adonis-lucid/issues/48)
* **lucid:** add fresh method to grab fresh instance ([a1966eb](https://github.com/adonisjs/adonis-lucid/commit/a1966eb))
* **lucid:** add ids and pair static methods ([2be9839](https://github.com/adonisjs/adonis-lucid/commit/2be9839))
* **lucid:** add incrementing flag ([f9f9410](https://github.com/adonisjs/adonis-lucid/commit/f9f9410)), closes [#89](https://github.com/adonisjs/adonis-lucid/issues/89)
* **lucid:** add new date formatting ([172910e](https://github.com/adonisjs/adonis-lucid/commit/172910e))
* **lucid:** add static methods ([ed37c09](https://github.com/adonisjs/adonis-lucid/commit/ed37c09))
* **lucid:** add support for firstOrFail ([785b5c2](https://github.com/adonisjs/adonis-lucid/commit/785b5c2))
* **lucid:** add support for global query scopes ([61f9767](https://github.com/adonisjs/adonis-lucid/commit/61f9767))
* **lucid:** add support for local query scopes ([4607641](https://github.com/adonisjs/adonis-lucid/commit/4607641))
* **lucid:** add support for paginate via model ([d4dc0bc](https://github.com/adonisjs/adonis-lucid/commit/d4dc0bc))
* **lucid:** add support for pick,pickInverse and paginate ([45f7c45](https://github.com/adonisjs/adonis-lucid/commit/45f7c45))
* **lucid:** add support for pluckFirst and pluckId ([d2200f5](https://github.com/adonisjs/adonis-lucid/commit/d2200f5))
* **lucid:** add support for transactions ([5c32b3f](https://github.com/adonisjs/adonis-lucid/commit/5c32b3f)), closes [#43](https://github.com/adonisjs/adonis-lucid/issues/43)
* **lucid:** implement find and findBy methods ([cff2f7e](https://github.com/adonisjs/adonis-lucid/commit/cff2f7e))
* **lucid:** implement model basic functionality ([1bb531f](https://github.com/adonisjs/adonis-lucid/commit/1bb531f))
* **lucid-model:** first draft of model implementation ([b4d6851](https://github.com/adonisjs/adonis-lucid/commit/b4d6851))
* **lucid:relations:** add createMany and saveMany methods ([1e258e4](https://github.com/adonisjs/adonis-lucid/commit/1e258e4))
* **lucid:traits:** add support for assigning traits ([45d7851](https://github.com/adonisjs/adonis-lucid/commit/45d7851))
* **migrations:** add migrations time in the console output ([d19c571](https://github.com/adonisjs/adonis-lucid/commit/d19c571)), closes [#57](https://github.com/adonisjs/adonis-lucid/issues/57)
* **migrations:** add status method ([8913904](https://github.com/adonisjs/adonis-lucid/commit/8913904))
* **migrations:** add support for --log flag to log queries to console ([d616de8](https://github.com/adonisjs/adonis-lucid/commit/d616de8))
* **migrations:** add support for making db actions ([8264de9](https://github.com/adonisjs/adonis-lucid/commit/8264de9)), closes [#53](https://github.com/adonisjs/adonis-lucid/issues/53)
* **migrations:** add support for migrations ([65622ad](https://github.com/adonisjs/adonis-lucid/commit/65622ad))
* **migrations,schema:** implement schema and migrations ([15b2e10](https://github.com/adonisjs/adonis-lucid/commit/15b2e10))
* **model:** add support for createMany ([1f639d4](https://github.com/adonisjs/adonis-lucid/commit/1f639d4))
* **model:** add support for orFail methods ([3cf3152](https://github.com/adonisjs/adonis-lucid/commit/3cf3152))
* **model:** add support to delete model instance ([3994df5](https://github.com/adonisjs/adonis-lucid/commit/3994df5))
* **model:** implement static first and last ([84a67e4](https://github.com/adonisjs/adonis-lucid/commit/84a67e4))
* **pluck:** make pluck method to select multiple fields ([20f804d](https://github.com/adonisjs/adonis-lucid/commit/20f804d))
* **providers:** add providers to adonis fold ([6db7d50](https://github.com/adonisjs/adonis-lucid/commit/6db7d50))
* **query:** add paginate on model query builder ([0ff24e7](https://github.com/adonisjs/adonis-lucid/commit/0ff24e7))
* **query:** add support for withCount ([b87eb40](https://github.com/adonisjs/adonis-lucid/commit/b87eb40))
* **query:** filter model results based upon relations ([79cb823](https://github.com/adonisjs/adonis-lucid/commit/79cb823))
* **relation:** add associate and dissociate methods ([451eea0](https://github.com/adonisjs/adonis-lucid/commit/451eea0))
* **relation:** add detach and delete on belongsToMany ([0e26f92](https://github.com/adonisjs/adonis-lucid/commit/0e26f92))
* **relation:** add update method to relations ([e82b97c](https://github.com/adonisjs/adonis-lucid/commit/e82b97c))
* **relation:** basic implementation of belongs to ([7e69a19](https://github.com/adonisjs/adonis-lucid/commit/7e69a19))
* **relations:** add basic eagerloading support ([bc340c5](https://github.com/adonisjs/adonis-lucid/commit/bc340c5))
* **relations:** add basic support for belongsToMany ([538e0f5](https://github.com/adonisjs/adonis-lucid/commit/538e0f5))
* **relations:** add basic support for hasMany ([eed5368](https://github.com/adonisjs/adonis-lucid/commit/eed5368))
* **relations:** add basic support for relations ([d6a6c93](https://github.com/adonisjs/adonis-lucid/commit/d6a6c93))
* **relations:** add delete and update on belongsToMany ([8e6315c](https://github.com/adonisjs/adonis-lucid/commit/8e6315c))
* **relations:** add save,create and attach methods ([646d0cb](https://github.com/adonisjs/adonis-lucid/commit/646d0cb))
* **relations:** add support for managing pivot table ([bafb11f](https://github.com/adonisjs/adonis-lucid/commit/bafb11f)), closes [#69](https://github.com/adonisjs/adonis-lucid/issues/69)
* **relations:** add support for withTimestamps in belongsToMany ([d120ae6](https://github.com/adonisjs/adonis-lucid/commit/d120ae6)), closes [#84](https://github.com/adonisjs/adonis-lucid/issues/84)
* **relations:** add support to save pivot values during save/create ([2e0ad5a](https://github.com/adonisjs/adonis-lucid/commit/2e0ad5a))
* **relations:** filter results based upon relations ([6146c2a](https://github.com/adonisjs/adonis-lucid/commit/6146c2a)), closes [#92](https://github.com/adonisjs/adonis-lucid/issues/92)
* **relations:** hasManyThrough works fine with belongsToMany ([4b3380c](https://github.com/adonisjs/adonis-lucid/commit/4b3380c))
* **relations:** implement has many through relation ([f5ab7ec](https://github.com/adonisjs/adonis-lucid/commit/f5ab7ec))
* **relations:** implement hasManyThrough relationship ([2d6b6d1](https://github.com/adonisjs/adonis-lucid/commit/2d6b6d1))
* **relations:** pick selected fields in belongsToMany ([3d5a64d](https://github.com/adonisjs/adonis-lucid/commit/3d5a64d))
* **relationship:** add hasOne relationship ([5a3d240](https://github.com/adonisjs/adonis-lucid/commit/5a3d240))
* **schema:** add base schema class ([10bcf5d](https://github.com/adonisjs/adonis-lucid/commit/10bcf5d))
* **schema:** add method to execute actions ([5cf6c57](https://github.com/adonisjs/adonis-lucid/commit/5cf6c57))
* **schema:** add support for returning sql statements ([89feff9](https://github.com/adonisjs/adonis-lucid/commit/89feff9))
* **seeds:** initiate support for seeds and factories ([e51864b](https://github.com/adonisjs/adonis-lucid/commit/e51864b))
* **tests:** add acceptance tests for model ([21e4de9](https://github.com/adonisjs/adonis-lucid/commit/21e4de9))
* **traits:** add support for traits ([bced30d](https://github.com/adonisjs/adonis-lucid/commit/bced30d))
* **util:** add method to pull .js files from a directory ([270d265](https://github.com/adonisjs/adonis-lucid/commit/270d265))
* **util:** isolate lodash instance on collection ([1778c19](https://github.com/adonisjs/adonis-lucid/commit/1778c19))


### Performance Improvements

* **lucid:hooks:** resolve hooks when adding ([2a39339](https://github.com/adonisjs/adonis-lucid/commit/2a39339))



<a name="3.0.16"></a>
## [3.0.16](https://github.com/adonisjs/adonis-lucid/compare/v3.0.15...v3.0.16) (2017-05-05)

### Features

* **relation:** add update method to relations ([6151b78](https://github.com/adonisjs/adonis-lucid/commit/6151b78))



<a name="3.0.15"></a>
## [3.0.15](https://github.com/adonisjs/adonis-lucid/compare/v3.0.14...v3.0.15) (2017-04-09)


### Bug Fixes

* **package:** update node-exceptions to version 2.0.0 ([#111](https://github.com/adonisjs/adonis-lucid/issues/111)) ([38acb47](https://github.com/adonisjs/adonis-lucid/commit/38acb47))
* **soft-deletes:** pairs and ids ignore soft deleted ([c394950](https://github.com/adonisjs/adonis-lucid/commit/c394950)), closes [#109](https://github.com/adonisjs/adonis-lucid/issues/109)



<a name="3.0.14"></a>
## [3.0.14](https://github.com/adonisjs/adonis-lucid/compare/v3.0.13...v3.0.14) (2017-02-25)


### Bug Fixes

* **hooks:** improve defineHooks signature ([ca614e0](https://github.com/adonisjs/adonis-lucid/commit/ca614e0)), closes [#94](https://github.com/adonisjs/adonis-lucid/issues/94)
* **migration:** ignore prefixing inside migrations ([5aebc5b](https://github.com/adonisjs/adonis-lucid/commit/5aebc5b)), closes [#105](https://github.com/adonisjs/adonis-lucid/issues/105)
* **util:** filter .js files before requiring them ([a21d6fc](https://github.com/adonisjs/adonis-lucid/commit/a21d6fc)), closes [#96](https://github.com/adonisjs/adonis-lucid/issues/96)



<a name="3.0.13"></a>
## [3.0.13](https://github.com/adonisjs/adonis-lucid/compare/v3.0.12...v3.0.13) (2017-01-26)


### Bug Fixes

* **migrations:** select column as {name} ([0a09111](https://github.com/adonisjs/adonis-lucid/commit/0a09111)), closes [#82](https://github.com/adonisjs/adonis-lucid/issues/82)


### Features

* **lucid:** add incrementing flag ([7cad89a](https://github.com/adonisjs/adonis-lucid/commit/7cad89a)), closes [#89](https://github.com/adonisjs/adonis-lucid/issues/89)
* **relations:** add support for withTimestamps in belongsToMany ([41dd327](https://github.com/adonisjs/adonis-lucid/commit/41dd327)), closes [#84](https://github.com/adonisjs/adonis-lucid/issues/84)
* **relations:** add support to save pivot values during save/create ([774757d](https://github.com/adonisjs/adonis-lucid/commit/774757d))
* **relations:** filter results based upon relations ([80afc1d](https://github.com/adonisjs/adonis-lucid/commit/80afc1d)), closes [#92](https://github.com/adonisjs/adonis-lucid/issues/92)



<a name="3.0.12"></a>
## [3.0.12](https://github.com/adonisjs/adonis-lucid/compare/v3.0.11...v3.0.12) (2016-12-15)


### Bug Fixes

* **database:** rename pluck to pluckAll ([410f700](https://github.com/adonisjs/adonis-lucid/commit/410f700)), closes [#81](https://github.com/adonisjs/adonis-lucid/issues/81)



<a name="3.0.11"></a>
## [3.0.11](https://github.com/adonisjs/adonis-lucid/compare/v3.0.10...v3.0.11) (2016-12-12)


### Bug Fixes

* **db:seed:** make sure --files accept value ([0edd6cc](https://github.com/adonisjs/adonis-lucid/commit/0edd6cc))
* **migrations:** add order by clause ([0d1b9de](https://github.com/adonisjs/adonis-lucid/commit/0d1b9de))
* **migrations:** fix migrations log output ([758ef01](https://github.com/adonisjs/adonis-lucid/commit/758ef01))


### Features

* **commands:** seed db inside run and refresh command ([8e367fd](https://github.com/adonisjs/adonis-lucid/commit/8e367fd))
* **model:** implement static first and last ([2a74d6e](https://github.com/adonisjs/adonis-lucid/commit/2a74d6e))
* **pluck:** make pluck method to select multiple fields ([d8603d1](https://github.com/adonisjs/adonis-lucid/commit/d8603d1))
* **relations:** add support for managing pivot table ([1d00425](https://github.com/adonisjs/adonis-lucid/commit/1d00425)), closes [#69](https://github.com/adonisjs/adonis-lucid/issues/69)



<a name="3.0.10"></a>
## [3.0.10](https://github.com/adonisjs/adonis-lucid/compare/v3.0.9...v3.0.10) (2016-11-02)


### Bug Fixes

* **database:** paginate count query to ignore order by ([ac16baa](https://github.com/adonisjs/adonis-lucid/commit/ac16baa)), closes [#64](https://github.com/adonisjs/adonis-lucid/issues/64)
* **lucid:relations:** implement delete method to delete relations ([0067bca](https://github.com/adonisjs/adonis-lucid/commit/0067bca)), closes [#63](https://github.com/adonisjs/adonis-lucid/issues/63)



<a name="3.0.9"></a>
## [3.0.9](https://github.com/adonisjs/adonis-lucid/compare/v3.0.8...v3.0.9) (2016-10-19)


### Bug Fixes

* **migrations:** make sure schema callback is function before executing ([444b2d6](https://github.com/adonisjs/adonis-lucid/commit/444b2d6)), closes [#60](https://github.com/adonisjs/adonis-lucid/issues/60)


### Features

* **migrations:** add migrations time in the console output ([1fca2d5](https://github.com/adonisjs/adonis-lucid/commit/1fca2d5)), closes [#57](https://github.com/adonisjs/adonis-lucid/issues/57)



<a name="3.0.8"></a>
## [3.0.8](https://github.com/adonisjs/adonis-lucid/compare/v3.0.7...v3.0.8) (2016-10-11)

* **factory** select table before factory.reset ([56e149e](https://github.com/adonisjs/adonis-lucid/pull/55/commits/56e149e2f838d2b79d309460f53be26963186639)), closes [#56](https://github.com/adonisjs/adonis-lucid/issues/56)

<a name="3.0.7"></a>
## [3.0.7](https://github.com/adonisjs/adonis-lucid/compare/v3.0.6...v3.0.7) (2016-10-04)


### Features

* **database:** add support for table prefixing ([22399a0](https://github.com/adonisjs/adonis-lucid/commit/22399a0)), closes [#58](https://github.com/adonisjs/adonis-lucid/issues/58)
* **migrations:** add support for making db actions ([073daa7](https://github.com/adonisjs/adonis-lucid/commit/073daa7)), closes [#53](https://github.com/adonisjs/adonis-lucid/issues/53)



<a name="3.0.6"></a>
## [3.0.6](https://github.com/adonisjs/adonis-lucid/compare/v3.0.5...v3.0.6) (2016-09-27)


### Bug Fixes

* **lucid:** use primary key instead of id ([f85da85](https://github.com/adonisjs/adonis-lucid/commit/f85da85)), closes [#51](https://github.com/adonisjs/adonis-lucid/issues/51)



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



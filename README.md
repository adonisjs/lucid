# AdonisJS Lucid

> **NB - WORK IN PROGRESS**

[![Gitter](https://img.shields.io/badge/+%20GITTER-JOIN%20CHAT%20%E2%86%92-1DCE73.svg?style=flat-square)](https://gitter.im/adonisjs/adonis-framework)
[![Trello](https://img.shields.io/badge/TRELLO-%E2%86%92-89609E.svg?style=flat-square)](https://trello.com/b/yzpqCgdl/adonis-for-humans)
[![Version](https://img.shields.io/npm/v/adonis-lucid.svg?style=flat-square)](https://www.npmjs.com/package/adonis-lucid)
[![Build Status](https://img.shields.io/travis/adonisjs/adonis-lucid/master.svg?style=flat-square)](https://travis-ci.org/adonisjs/adonis-lucid)
[![Coverage Status](https://img.shields.io/coveralls/adonisjs/adonis-lucid/master.svg?style=flat-square)](https://coveralls.io/github/adonisjs/adonis-lucid?branch=master)
[![Downloads](https://img.shields.io/npm/dt/adonis-lucid.svg?style=flat-square)](https://www.npmjs.com/package/adonis-lucid)
[![License](https://img.shields.io/npm/l/adonis-lucid.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> :pray: This repository is the official SQL ORM for adonis framework.

Adonis lucid is a database query builder and ORM for Adonis framework. It also has support for database migrations, seeds and factories.

You can learn more about AdonisJS and all of its awesomeness on http://adonisjs.com :evergreen_tree:

## Table of Contents

* [Team Members](#team-members)
* [Database Supported](#database-supported)
* [Getting Started](#getting-started)
* [Contribution Guidelines](#contribution-guidelines)

## <a name="team-members"></a>Team Members

* Harminder Virk ([Caffiene Blogging](http://amanvirk.me/)) <virk.officials@gmail.com>

## <a name="database-supported"></a>Database Supported

Below is the list of databases officially supported by Adonis Lucid.

- pg
- sqlite3
- mysql
- mysql2
- mariasql
- strong-oracle
- oracle


## <a name="getting-started"></a>Getting Started

Lucid is included by default with every new adonis application, but here are the steps, if in case you want to set it up manually.

```bash
$ npm i --save adonis-lucid
```

and then register lucid providers inside the your `bootstrap/app.js` file.

```javascript
const providers = [
  'adonis-lucid/providers/DatabaseProvider',
  'adonis-lucid/providers/LucidProvider',
  'adonis-lucid/providers/SchemaProvider',
  'adonis-lucid/providers/MigrationsProvider',
  'adonis-lucid/providers/CommandsProvider',
  'adonis-lucid/providers/FactoryProvider',
  'adonis-lucid/providers/SeederProvider',  
]
```

setting up aliases inside `bootstrap/app.js` file.

```javascript
const aliases = {
  Database: 'Adonis/Src/Database',
  Lucid: 'Adonis/Src/Lucid',
  Schema: 'Adonis/Src/Schema'
  Migrations: 'Adonis/Src/Migrations',
  Factory: 'Adonis/Src/Factory'
}
```

[Official Documentation](http://adonisjs.com/docs/2.0/installation)

## <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.

You can find a complete guide to be followed strictly before submitting your pull requests in the [Official Documentation](http://adonisjs.com/docs/contributing).

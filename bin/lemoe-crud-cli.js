#!/usr/bin/env node

const { chalk } = require('chalk');
const { program } = require('commander');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const mysql = require('mysql2/promise');
const pluralize = require('pluralize');
const toml = require('toml');

program.version(require('../package').version).usage('<command> [options]');

program
  .command('generate')
  .option('-f --force')
  .description('generate code')
  .alias('g')
  .action(async (options) => {
    const path =
      process.platform == 'win32' ? process.env.USERPROFILE : process.env.HOME;
    const filename = `${path}/.lemoe-crud`;
    if (!fs.existsSync(filename)) {
      console.log(`Use ${chalk.cyan('lemoe-crud-cli c')} to config database.`);
      return;
    }

    const { type, model } = await inquirer.prompt([
      {
        type: 'list',
        message: 'What template do you want?',
        choices: ['web', 'php'],
        name: 'type',
      },
      {
        type: 'input',
        message: 'What is the model name?',
        name: 'model',
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid model name.';
        },
      },
    ]);

    let title = '数据';
    if (type === 'web') {
      title = (
        await inquirer.prompt([
          {
            type: 'input',
            message: 'What is the model title?',
            name: 'title',
            validate(value) {
              if (value) {
                return true;
              }

              return 'Please enter a valid model title.';
            },
          },
        ])
      ).title;
    }

    let pathname = '';
    if (process.platform == 'win32') {
      pathname = process.cwd().split('\\').pop();
    } else {
      pathname = process.cwd().split('/').pop();
    }
    const defaultDatabase = pathname.replace('-admin', '').replace(/-/g, '_');
    const { database } = await inquirer.prompt([
      {
        type: 'input',
        message: 'What is the database?',
        name: 'database',
        default: defaultDatabase,
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid database.';
        },
      },
    ]);

    const fd = await fs.promises.open(filename, 'r');
    const data = await fd.readFile({ encoding: 'utf8' });
    fd.close();
    const config = toml.parse(data);

    const connection = await mysql.createConnection({
      host: config.host,
      user: config.username,
      password: config.password,
      database: database,
    });

    const structure = (
      await connection.execute(
        `SHOW FULL COLUMNS FROM \`${pluralize.plural(model)}\``
      )
    )[0];

    connection.end();

    if (type === 'web') {
      require('../lib/generate/web')(model, title, structure, options);
    } else if (type === 'php') {
      require('../lib/generate/php')(model, structure, options);
    }
  });

program
  .command('remove')
  .description('remove code')
  .alias('r')
  .action(async () => {
    const { type, model } = await inquirer.prompt([
      {
        type: 'list',
        message: 'What template do you want?',
        choices: ['web', 'php'],
        name: 'type',
      },
      {
        type: 'input',
        message: 'What is the model name?',
        name: 'model',
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid model name.';
        },
      },
    ]);

    if (type === 'web') {
      require('../lib/remove/web')(model);
    } else if (type === 'php') {
      require('../lib/remove/php')(model);
    }
  });

program
  .command('config')
  .description('config database')
  .alias('c')
  .action(async () => {
    const { host, username, password } = await inquirer.prompt([
      {
        type: 'input',
        message: 'What is your database host?',
        name: 'host',
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid database host.';
        },
      },
      {
        type: 'input',
        message: 'What is your database username?',
        name: 'username',
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid database username.';
        },
      },
      {
        type: 'password',
        message: 'What is your database password?',
        name: 'password',
        validate(value) {
          if (value) {
            return true;
          }

          return 'Please enter a valid database password.';
        },
      },
    ]);

    const path =
      process.platform == 'win32' ? process.env.USERPROFILE : process.env.HOME;
    const fd = await fs.promises.open(`${path}/.lemoe-crud`, 'w');
    await fd.writeFile(
      `host = "${host}"\nusername = "${username}"\npassword = "${password}"`
    );
    fd.close();
  });

program.parse(process.argv);

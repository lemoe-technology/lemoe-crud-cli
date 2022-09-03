const chalk = require('chalk');
const ejs = require('ejs');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const path = require('path');
const pluralize = require('pluralize');

module.exports = async (model, title, structure, options) => {
  console.log(`🚀 Generating ${chalk.cyan(model)}...`);

  await generateApi(model, options);
  await generateView(model, structure, title, options);
  await updateMenu(model, title);
  await updateRouter(model, title);
};

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const generateApi = async (model, options) => {
  const filename = `src/apis/${model}.js`;

  if (fs.existsSync(filename)) {
    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          message: `Do you want to overwrite ${chalk.cyan(filename)}?`,
          name: 'overwrite',
          default: false,
        },
      ]);
      if (answer.overwrite === false) {
        console.log(
          `${chalk.red('✘')} Unsuccessfully generate: ${chalk.cyan(filename)}`
        );
        return;
      }
    }
  }

  const fd = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/web/api.html'),
    {
      models: pluralize.plural(model),
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(filename)}`
  );
};

const generateView = async (model, structure, title, options) => {
  const directory = `src/views/${model}`;

  if (fs.existsSync(directory)) {
    if (!options.force) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          message: `Do you want to overwrite ${chalk.cyan(directory)}?`,
          name: 'overwrite',
          default: false,
        },
      ]);
      if (answer.overwrite === false) {
        console.log(
          `${chalk.red('✘')} Unsuccessfully generate: ${chalk.cyan(directory)}`
        );
        return;
      }
    }
  }

  await fs.copy(path.resolve(__dirname, '../templates/web/view'), directory);

  const meta = {};
  meta.structures = [];
  meta.importApis = [`import ${model}Api from '@/apis/${model}';`];
  if (structure.some((column) => column.Type === 'tinyint unsigned')) {
    meta.hasEnum = true;
  }
  structure.forEach((column) => {
    const title = column.Comment.split(' ')[0];
    if (
      !['id', 'created_at', 'updated_at', 'deleted_at'].includes(column.Field)
    ) {
      if (column.Type.includes('varchar')) {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'text',
    },`
        );
      } else if (column.Type === 'text') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'paragraph',
    },`
        );
      } else if (column.Type.startsWith('decimal')) {
        const found = column.Type.match(/decimal\(\d+,(?<precision>\d+)\)/);
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'number',
      typeOptions: {
        min: 0,
        precision: ${found.groups.precision},
      },
    },`
        );
      } else if (column.Type === 'int' || column.Type === 'float') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'number',
    },`
        );
      } else if (column.Type === 'tinyint unsigned') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      ...store.getters.getOptions('${model}.${column.Field}'), // TODO: update constant
      sortable: false,
    },`
        );
      } else if (column.Type === 'date') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'date',
    },`
        );
      } else if (column.Type === 'time') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'time',
    },`
        );
      } else if (column.Type === 'datetime') {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'datetime',
    },`
        );
      } else if (column.Type === 'bigint unsigned') {
        const modelName = column.Field.split('_')
          .slice(0, -1)
          .map((string, index) => (index === 0 ? string : capitalize(string)))
          .join('');
        meta.importApis.push(
          `import ${modelName}Api from '@/apis/${modelName}';`
        );
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'foreign',
      query: async (keyword) =>
        (await ${modelName}Api.query({ name: keyword })).data.map((item) => ({
          value: item.id,
          label: item.name, // TODO: update model keyword
        })),
      sortable: false,
    },`
        );
      } else {
        meta.structures.push(
          `{
      name: '${column.Field}',
      title: '${title}',
      type: 'text',
    }, // TODO: ${column.Type} is not predefined`
        );
      }
    }
  });
  meta.importApis.sort();

  const filename = `src/views/${model}/structure.js`;
  const fd = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/web/structure.html'),
    {
      model,
      models: pluralize.plural(model),
      title,
      meta,
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(directory)}`
  );
};

const updateMenu = async (model, title) => {
  const filename = `src/store/modules/menu.js`;

  const fdr = await fs.promises.open(filename, 'r');
  const filedata = await fdr.readFile({ encoding: 'utf8' });
  fdr.close();
  const found = filedata.match(/items: \[\n/s);
  const position = found[0].length + found.index;

  const fdw = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/web/menu.html'),
    {
      models: pluralize.plural(model),
      title,
    }
  );
  await fdw.writeFile(
    [filedata.slice(0, position), string, filedata.slice(position)].join('')
  );
  fdw.close();

  console.log(
    `${chalk.green('✔')} Successfully update: ${chalk.cyan(filename)}`
  );
};

const updateRouter = async (model, title) => {
  const filename = `src/store/modules/router.js`;

  const fdr = await fs.promises.open(filename, 'r');
  const filedata = await fdr.readFile({ encoding: 'utf8' });
  fdr.close();
  const found = filedata.match(/items: \[\n/s);
  const position = found[0].length + found.index;

  const fdw = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/web/router.html'),
    {
      model,
      models: pluralize.plural(model),
      title,
    }
  );
  await fdw.writeFile(
    [filedata.slice(0, position), string, filedata.slice(position)].join('')
  );
  fdw.close();

  console.log(
    `${chalk.green('✔')} Successfully update: ${chalk.cyan(filename)}`
  );
};

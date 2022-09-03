const chalk = require('chalk');
const ejs = require('ejs');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const path = require('path');
const pluralize = require('pluralize');

module.exports = async (model, structure, options) => {
  console.log(`🚀 Generating ${chalk.cyan(model)}...`);

  await generateController(model, options);
  await generateRequest(model, structure, options);
  await generateResource(model, structure, options);
  await generateModel(model, structure, options);
  await generateService(model, structure, options);
  await updateRoute(model);
};

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const generateController = async (model, options) => {
  const filename = `app/Http/Controllers/${capitalize(model)}Controller.php`;

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
    path.resolve(__dirname, '../templates/php/controller.html'),
    {
      model: model,
      Model: capitalize(model),
      models: pluralize.plural(model),
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(filename)}`
  );
};

const generateRequest = async (model, structure, options) => {
  const directory = `app/Http/Requests/${capitalize(model)}`;

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
  } else {
    await fs.promises.mkdir(directory);
  }

  [
    'BulkDestroyRequest',
    'DestroyRequest',
    'IndexRequest',
    'QueryRequest',
    'ShowRequest',
    'StoreRequest',
    'UpdateRequest',
  ].forEach(async (file) => {
    const meta = {};
    if (file === 'StoreRequest' || file === 'UpdateRequest') {
      meta.rules = [];
      meta.useModels = [];
      if (structure.some((column) => column.Type === 'tinyint unsigned')) {
        meta.hasEnum = true;
        meta.useModels.push(`use App\\Models\\${capitalize(model)};`);
      }
      meta.attributes = [];

      structure.forEach((column) => {
        const title = column.Comment.split(' ')[0];
        if (
          !['id', 'created_at', 'updated_at', 'deleted_at'].includes(
            column.Field
          )
        ) {
          meta.attributes.push(`'${column.Field}' => '${title}',`);
          if (column.Type.includes('varchar')) {
            const found = column.Type.match(/varchar\((.*)\)/);

            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push(`max:${found[1]}`);
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type.startsWith('decimal')) {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('numeric');
            rules.push('min:0');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'int') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('integer');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'float') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('numeric');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'tinyint unsigned') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push("'sometimes'");
            }
            if (column.Default === null) {
              rules.push("'required'");
            }
            rules.push('Rule::in([])');
            meta.rules.push(`'${column.Field}' => [
                ${rules.join(
                  ',\n                '
                )}, // TODO: fill constant value
            ],`);
          } else if (column.Type === 'date') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('date_format:Y-m-d');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'time') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('date_format:H:i:s');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'datetime') {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            rules.push('date_format:Y-m-d H:i:s');
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          } else if (column.Type === 'bigint unsigned') {
            const modelName = column.Field.split('_')
              .slice(0, -1)
              .map((string) => capitalize(string))
              .join('');
            meta.useModels.push(`use App\\Models\\${modelName};`);

            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push("'sometimes'");
            }
            rules.push("'required'");
            if (column.Default === null) {
              rules.push("'integer'");
            }
            rules.push(`function ($attribute, $value, $fail) {
                    if (${modelName}::where('id', $value)->doesntExist()) {
                        $fail('${column.Comment}不存在');
                    }
                }`);
            meta.rules.push(`'${column.Field}' => [
                ${rules.join(',\n                ')},
            ],`);
          } else {
            const rules = [];
            if (file === 'UpdateRequest') {
              rules.push('sometimes');
            }
            if (column.Default === null) {
              rules.push('required');
            }
            meta.rules.push(`'${column.Field}' => '${rules.join('|')}',`);
          }
        }

        meta.useModels.sort();
      });
    }

    const filename = `${directory}/${file}.php`;
    const fd = await fs.promises.open(filename, 'w');
    const string = await ejs.renderFile(
      path.resolve(__dirname, `../templates/php/request/${file}.html`),
      {
        Model: capitalize(model),
        meta,
      }
    );
    await fd.writeFile(string);
    fd.close();
  });

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(directory)}`
  );
};

const generateResource = async (model, structure, options) => {
  const filename = `app/Http/Resources/${capitalize(model)}Resource.php`;

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

  const meta = {};
  meta.resources = [];
  structure.forEach((column) => {
    if (
      !['id', 'created_at', 'updated_at', 'deleted_at'].includes(column.Field)
    ) {
      meta.resources.push(`'${column.Field}' => $this->${column.Field},`);
      if (column.Type === 'bigint unsigned') {
        const columnName = column.Field.split('_').slice(0, -1).join('_');
        const modelName = column.Field.split('_')
          .slice(0, -1)
          .map((string) => capitalize(string))
          .join('');
        meta.resources.push(
          `'${columnName}' => new ${modelName}Resource($this->${columnName}),`
        );
      }
    }
  });

  const fd = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/php/resource.html'),
    {
      Model: capitalize(model),
      meta,
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(filename)}`
  );
};

const generateModel = async (model, structure, options) => {
  const filename = `app/Models/${capitalize(model)}.php`;

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

  const meta = {};
  meta.constants = [];
  structure
    .filter((column) => column.Type === 'tinyint unsigned')
    .forEach((column) => {
      meta.constants.push(`// TODO: fill ${column.Field} constant value\n`);
    });

  meta.casts = [];
  structure
    .filter((column) => column.Type === 'json')
    .forEach((column) => {
      meta.casts.push(`'${column.Field}' => 'array',`);
    });

  meta.relationships = [];
  structure
    .filter((column) => column.Type === 'bigint unsigned')
    .forEach((column) => {
      if (column.Field !== 'id') {
        const columnName = column.Field.split('_').slice(0, -1).join('_');
        const modelName = column.Field.split('_')
          .slice(0, -1)
          .map((string) => capitalize(string))
          .join('');
        meta.relationships
          .push(`// TODO: update hasOne or hasMany method in ${modelName} model
    public function ${columnName}()
    {
        return $this->belongsTo(${modelName}::class);
    }\n`);
      }
    });

  const fd = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/php/model.html'),
    {
      Model: capitalize(model),
      meta,
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(filename)}`
  );
};

const generateService = async (model, structure, options) => {
  const filename = `app/Services/${capitalize(model)}Service.php`;

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

  const meta = {};
  meta.structures = [];
  structure.forEach((column) => {
    if (!['updated_at', 'deleted_at'].includes(column.Field)) {
      if (column.Type.includes('varchar') || column.Type === 'text') {
        meta.structures.push(`'${column.Field}' => 'fuzzy',`);
      } else if (
        ['date', 'time', 'datetime', 'timestamp'].includes(column.Type)
      ) {
        meta.structures.push(`'${column.Field}' => 'range',`);
      } else if (column.Type === 'json') {
        meta.structures.push(`'${column.Field}' => 'json_contain',`);
      } else if (
        !column.Type.startsWith('decimal') &&
        !['int', 'float'].includes(column.Type)
      ) {
        meta.structures.push(`'${column.Field}' => 'equal',`);
      }
    }
  });

  const fd = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/php/service.html'),
    {
      model: model,
      Model: capitalize(model),
      meta,
    }
  );
  await fd.writeFile(string);
  fd.close();

  console.log(
    `${chalk.green('✔')} Successfully generate: ${chalk.cyan(filename)}`
  );
};

const updateRoute = async (model) => {
  const filename = `routes/api.php`;

  const fdr = await fs.promises.open(filename, 'r');
  const filedata = await fdr.readFile({ encoding: 'utf8' });
  fdr.close();
  const found = filedata.match(
    / {4}Route::middleware\(\['auth'\]\)->group\(function \(\) {\n/s
  );
  const position = found[0].length + found.index;

  const fdw = await fs.promises.open(filename, 'w');
  const string = await ejs.renderFile(
    path.resolve(__dirname, '../templates/php/route.html'),
    {
      Model: capitalize(model),
      models: pluralize.plural(model),
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

const chalk = require('chalk');
const fs = require('fs-extra');

module.exports = async (model) => {
  console.log(`🚀 Removing ${chalk.cyan(model)}...`);

  await removeApi(model);
  await removeView(model);
};

const removeApi = async (model) => {
  const filename = `src/apis/${model}.js`;

  await fs.promises.unlink(filename);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(filename)}`
  );
};

const removeView = async (model) => {
  const directory = `src/views/${model}`;

  await fs.remove(directory);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(directory)}`
  );
};

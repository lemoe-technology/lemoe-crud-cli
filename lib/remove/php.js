const chalk = require('chalk');
const fs = require('fs-extra');

module.exports = async (model) => {
  console.log(`🚀 Removing ${chalk.cyan(model)}...`);

  await removeController(model);
  await removeRequest(model);
  await removeResource(model);
  await removeModel(model);
  await removeService(model);
};

const capitalize = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const removeController = async (model) => {
  const filename = `app/Http/Controllers/${capitalize(model)}Controller.php`;

  await fs.promises.unlink(filename);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(filename)}`
  );
};

const removeRequest = async (model) => {
  const directory = `app/Http/Requests/${capitalize(model)}`;

  await fs.remove(directory);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(directory)}`
  );
};

const removeResource = async (model) => {
  const filename = `app/Http/Resources/${capitalize(model)}Resource.php`;

  await fs.promises.unlink(filename);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(filename)}`
  );
};

const removeModel = async (model) => {
  const filename = `app/Models/${capitalize(model)}.php`;

  await fs.promises.unlink(filename);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(filename)}`
  );
};

const removeService = async (model) => {
  const filename = `app/Services/${capitalize(model)}Service.php`;

  await fs.promises.unlink(filename);

  console.log(
    `${chalk.green('✔')} Successfully remove: ${chalk.cyan(filename)}`
  );
};

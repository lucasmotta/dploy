'use strict';

import yargs from 'yargs';
import chalk from 'chalk';
import {version} from '../package.json';

const title = `${chalk.bold.magenta('DPLOY')} v${version}`;
const desc = 'Command line tool to deploy websites using FTP/SFTP and git.';


const argv = yargs
  .usage(`${title}\n${chalk.white(desc)}`)
  .help('help').alias('help', 'h')
  .version(title, 'version').alias('version', 'v')
  .demand(1)
  .options({
    'include-files': {
      alias: 'i',
      description: 'Upload the files inside the "include" parameter'
    },
    'catchup': {
      alias: 'c',
      description: 'Only upload the revision file'
    }
  })
  .example('dploy dev', 'Deploy the "dev" environment')
  .example('dploy dev stage live', 'Deploy the "dev", then "stage" and "live" environments')
  .example('dploy live --include-files', 'Deploy the "live" environment with the files set on the "include" parameter')
  .example('dploy stage --catchup', 'Upload only the revision file to "stage"')
  .epilogue(`To read more about ${chalk.magenta('DPLOY')}, check:\n${chalk.white('https://github.com/LeanMeanFightingMachine/dploy')}`)
  .argv;


export default argv;

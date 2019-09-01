const path = require('path'); 

const featureName = 'env';
module.exports = {
  name: featureName,
  run: async (context) => {
    let subcommand = 'help'; 
    if(context.input.subCommands && context.input.subCommands.length > 0){
        subcommand = context.input.subCommands[0];
    }
    if(subcommand === 'help'){
      displayHelp(); 
    }else{
      let commandModule; 

      try{
        commandModule = require(path.normalize(path.join(__dirname, 'env', subcommand)));
      }catch{
        displayHelp(); 
      }

      if(commandModule){
        await commandModule.run(context); 
      }
    }
  },
};


function displayHelp(){
  const header = `amplify ${featureName} <subcommands>`;

  const commands = [
    {
      name: 'add',
      description: 'Adds a new environment to your Amplify Project',
    },
    {
      name: 'pull [--restore]',
      description: 'Pulls your environment with the current cloud environment. Use the restore flag to overwrite your local backend configs with that of the cloud.',
    },
    {
      name: 'checkout <env-name> [--restore]',
      description: 'Moves your environment to the environment specified in the command. Use the restore flag to overwrite your local backend configs with the backend configs of the environment specified.',
    },
    {
      name: 'list [--details] [--json]',
      description: 'Displays a list of all the environments in your Amplify project',
    },
    {
      name: 'get --name <env-name> [--json]',
      description: 'Displays the details of the environment specified in the command',
    },
    {
      name: 'import --name <env-name> --config <provider-configs> [--awsInfo <aws-configs>]',
      description: 'Imports an already existing Amplify project environment stack to your local backend',
    },
    {
      name: 'remove <env-name>',
      description: 'Removes an environment from the Amplify project',
    },
  ];

  context.amplify.showHelp(header, commands);

  context.print.info('');
}
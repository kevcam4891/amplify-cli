import path from 'path';
import fs from 'fs-extra';
import inquirer from '../domain/inquirer-helper';
import Context from '../domain/context';
import Constant from '../domain/constants'
import { AmplifyEvent } from '../domain/amplify-event';
import { AmplifyPluginType } from '../domain/amplify-plugin-type';
import { readJsonFileSync } from '../utils/readJsonFile';
import constants from '../domain/constants';
import { validPluginNameSync } from './verify-plugin'; 
import { createIndentation } from './display-plugin-platform'; 
import { conditionalExpression } from '@babel/types';


export default async function newPlugin(context: Context, pluginParentDirPath: string): Promise<string | undefined>  {
    const pluginName = await getPluginName(context, pluginParentDirPath);
    if (pluginName) {
        return await copyAndUpdateTemplateFiles(context, pluginParentDirPath, pluginName!);
    } else {
        return undefined;
    }
}

async function getPluginName(context: Context, pluginParentDirPath: string): Promise<string | undefined> {
    let pluginName = 'my-amplify-plugin';
    const yesFlag = context.input.options && context.input.options[Constant.YES];

    if (context.input.subCommands!.length > 1) { //subcommands: ['new', 'name']
        pluginName = context.input.subCommands![1];
    } else if (!yesFlag) {
        const pluginNameQuestion = {
            type: 'input',
            name: 'pluginName',
            message: 'What should be the name of the plugin:',
            default: pluginName,
            validate: (input : string) => {
                const pluginNameValidationResult = validPluginNameSync(input); 
                if(!pluginNameValidationResult.isValid){
                    return pluginNameValidationResult.message || 'Invalid plugin name'
                }
                return true;
            }
        };
        const answer = await inquirer.prompt(pluginNameQuestion);
        pluginName = answer.pluginName;
    }

    const pluginDirPath = path.join(pluginParentDirPath, pluginName);

    if (fs.existsSync(pluginDirPath) && !yesFlag) {
        context.print.error(`The directory ${pluginName} already exists`);
        const overwriteQuestion = {
            type: 'confirm',
            name: 'ifOverWrite',
            message: 'Do you want to overwrite it?',
            default: false
        };
        const answer = await inquirer.prompt(overwriteQuestion);
        if (answer.ifOverWrite) {
            return pluginName;
        } else {
            return undefined;
        }
    }
    return pluginName;
}


async function copyAndUpdateTemplateFiles(context: Context, pluginParentDirPath: string, pluginName: string) {
    const pluginDirPath = path.join(pluginParentDirPath, pluginName);
    fs.emptyDirSync(pluginDirPath);

    const pluginType = await promptForPluginType(context);
    const eventHandlers = await promptForEventSubscription(context);

    let srcDirPath = path.join(__dirname, '../../templates/new-plugin');
    if(pluginType === AmplifyPluginType.frontend.toString()){
        srcDirPath = path.join(__dirname, '../../templates/new-plugin-frontend');
    }else if(pluginType === AmplifyPluginType.provider.toString()){
        srcDirPath = path.join(__dirname, '../../templates/new-plugin-provider');
    }
    fs.copySync(srcDirPath, pluginDirPath);

    updatePackageJson(pluginDirPath, pluginName);
    updateAmplifyPluginJson(pluginDirPath, pluginName, pluginType, eventHandlers);
    updateEventHandlersFolder(pluginDirPath, eventHandlers);

    return pluginDirPath;
}

async function promptForPluginType(context: Context): Promise<string> {
    const yesFlag = context.input.options && context.input.options[Constant.YES];

    if (yesFlag) {
        return AmplifyPluginType.util;
    }else{
        const pluginTypes = Object.keys(AmplifyPluginType);
        const LEARNMORE = 'Learn more about Amplify CLI plugin types'; 
        const choices = pluginTypes.concat([LEARNMORE]);
        const answer = await inquirer.prompt(
            {
                type: 'list',
                name: 'selection',
                message: 'Specify the plugin type',
                choices: choices,
                default: AmplifyPluginType.util
            });
        if(answer.selection === LEARNMORE){
            displayAmplifyPluginTypesLearnMore(context);
            return await promptForPluginType(context);
        }else{
            return  answer.selection; 
        }
    }
}

function displayAmplifyPluginTypesLearnMore(context: Context){
    context.print.green('The Amplify CLI supports these plugin types:'); 
    context.print.blue(AmplifyPluginType.category); 
    context.print.green(`${AmplifyPluginType.category} plugins allows the CLI \
user to add, remove and configure a set of backend resources, \
they use provider plugins to setup and update the actual resources in the cloud. \
The Amplify CLI Core does not have special handling for ${AmplifyPluginType.category} plugins.`);
    context.print.blue(AmplifyPluginType.provider); 
    context.print.green(`${AmplifyPluginType.provider} plugins expose methods \
for other plugins to properly setup and update resources in the cloud, they are responsible for \
the details of initialzing and maintaining communications with cloud services, e.g. AWS. \
The Ammplify CLI Core prompts the user to select ${AmplifyPluginType.provider} plugins to \
initialize during the execution of the amplify init command, and then invoke the init method of \
the selected ${AmplifyPluginType.provider} plugins. \
The Amplify CLI core will invoke the initialized ${AmplifyPluginType.provider} plugins' \
push method when amplify push command is executed.`);
    context.print.blue(AmplifyPluginType.frontend); 
    context.print.green(`${AmplifyPluginType.frontend} plugins detect \
the frontend framework used by the frontend project, and elect to handle the frontend project. \
Among other things, they generate the configuration file for the frontend libraries, \
e.g. the aws-exports.js file for the amplify js library. \
The Amplify CLI core invokes the scanProject methods of all the \
${AmplifyPluginType.frontend} plugins, the one that return the highest score \
is selected to handle the frontend project. \
Each time when the backend resources are updated, the createFrontendConfigs method of the \
selected ${AmplifyPluginType.frontend} plugin is invoked to generate or update \
the frontend configuration file.`);
    context.print.blue(AmplifyPluginType.util); 
    context.print.green(`${AmplifyPluginType.util} plugins are general purpose \
utility plugins, they provide utility functions for other plugins. The Amplify CLI Core does not \
have special handling for ${AmplifyPluginType.category} plugins.`);
}

async function promptForEventSubscription(context: Context): Promise<string[]>{
    const yesFlag = context.input.options && context.input.options[Constant.YES];
    const eventHandlers = Object.keys(AmplifyEvent);

    if (yesFlag) {
        return eventHandlers;
    }else{
        const LEARNMORE = 'Learn more about Amplify CLI events'; 
        const choices = eventHandlers.concat([LEARNMORE]);
        const answer = await inquirer.prompt(
            {
                type: 'checkbox',
                name: 'selections',
                message: 'What Amplify CLI events does the plugin subscribe to?',
                choices: choices,
                default: eventHandlers
            });
        if(answer.selections.includes(LEARNMORE)){
            displayAmplifyEventsLearnMore(context);
            return await promptForEventSubscription(context);
        }else{
            return answer.selections; 
        }
    }
}

function displayAmplifyEventsLearnMore(context: Context){
    const indentationStr = createIndentation(4); 
    context.print.green('The Amplify CLI aims to provide a flexible and loosely-coupled \
pluggable platforms for the plugins.'); 
    context.print.green('In order to achieve plugin-and-play for plugins of all types, \
so to eliminate the need for Amplify CLI core to explicitly reference plugin packages as \
dependencies, the platform broadcasts events for plugins to handle.'); 
    context.print.green('If a plugin subscribes to an event, its event handler is \
invoked by the Amplify CLI Core on such event.'); 
    context.print.green(''); 
    context.print.green('The Amplify CLI current broadcasts these events to plugins:'); 
    context.print.blue(AmplifyEvent.PreInit); 
    context.print.green(`${indentationStr}${AmplifyEvent.PreInit} is raised prior to the \
execution of the amplify init command.`);
    context.print.blue(AmplifyEvent.PostInit); 
    context.print.green(`${indentationStr}${AmplifyEvent.PostInit} is raised on the complete \
execution of the amplify init command.`);
    context.print.blue(AmplifyEvent.PrePush); 
    context.print.green(`${indentationStr}${AmplifyEvent.PrePush} is raised prior to the \
executionof the amplify push command.`);
    context.print.blue(AmplifyEvent.PostPush); 
    context.print.green(`${indentationStr}${AmplifyEvent.PostPush} is raised on the complete \
execution of the amplify push command.`);   
    context.print.warning('This feature is currently under actively development, \
events might be added or removed in future releases');
}

function updatePackageJson(pluginDirPath: string, pluginName: string): void {
    const filePath = path.join(pluginDirPath, 'package.json');
    const packageJson = readJsonFileSync(filePath);
    packageJson.name = pluginName;
    const jsonString = JSON.stringify(packageJson, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf8');
}

function updateAmplifyPluginJson(
    pluginDirPath: string,
    pluginName: string,
    pluginType: string,
    eventHandlers: string[]
): void {
    const filePath = path.join(pluginDirPath, constants.MANIFEST_FILE_NAME);
    const amplifyPluginJson = readJsonFileSync(filePath);
    amplifyPluginJson.name = pluginName;
    amplifyPluginJson.type = pluginType;
    amplifyPluginJson.eventHandlers = eventHandlers;
    const jsonString = JSON.stringify(amplifyPluginJson, null, 4);
    fs.writeFileSync(filePath, jsonString, 'utf8');
}

function updateEventHandlersFolder(
    pluginDirPath: string,
    eventHandlers: string[]
): void {
    const dirPath = path.join(pluginDirPath, 'event-handlers');
    const fileNames = fs.readdirSync(dirPath);

    fileNames.forEach((fileName) => {
        const eventName = fileName.replace('handle-', '').split('.')[0];
        if (!eventHandlers.includes(eventName)) {
            fs.removeSync(path.join(dirPath, fileName));
        }
    })
}
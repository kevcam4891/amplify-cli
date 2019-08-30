import Context from '../../domain/context';
import inquirer from '../../domain/inquirer-helper';
import PluginCollection from '../../domain/plugin-collection';
import { displayConfiguration, displayGeneralInfo, 
    displayPluginCollection, displayPluginInfoArray, displayPluginPlatform } from '../../plugin-helpers/display-plugin-platform'; 

export default async function list(context: Context) {
    const { pluginPlatform } = context;

    const plugins = 'plugins';
    const excluded = 'excluded';
    const generalInfo = 'general information';
    const configuration = 'configuration';
    const all = 'all';

    const options =
    [
        plugins,
        excluded,
        generalInfo,
        configuration,
        all
    ]

    const answer = await inquirer.prompt({
        type: 'list',
        name: 'selection',
        message: 'Select the section to list',
        choices: options
    });

    switch (answer.selection) {
        case plugins:
            listPluginCollection(context, pluginPlatform.plugins);
            break;
        case excluded:
            listPluginCollection(context, pluginPlatform.excluded);
            break;
        case generalInfo:
            displayGeneralInfo(context, pluginPlatform);
            break;
        case configuration:
            displayConfiguration(context, pluginPlatform);
            break;
        case all:
            displayPluginPlatform(context, pluginPlatform);
            break;
        default:
            listPluginCollection(context, pluginPlatform.plugins);
            break;
    }
}

async function listPluginCollection(context: Context, collection: PluginCollection) {
    const all = 'all';
    const options = Object.keys(collection);
    if (options.length > 0) {
        let toList = options[0];
        if (options.length > 1) {
            options.push(all);
            const answer = await inquirer.prompt({
                type: 'list',
                name: 'selection',
                message: 'Select the name of the plugin to list',
                choices: options
            });
            toList = answer.selection;
        }

        if (toList === all) {
            displayPluginCollection(context, collection);
        } else {
            displayPluginInfoArray(context, collection[toList]);
        }
    } else {
        context.print.info('The collection is empty');
    }
}
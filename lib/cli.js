import {version} from '../package';
import _ from 'lodash';
import chalk from 'chalk';
import camelCase from 'camel-case';
import process from 'process';

let taglines = {
    p: [
        'productive', 'perennial', 'paleontologic', 'potential', 'pretty',
        'powerless', 'preening', 'plunging', 'parochial', 'pernicious',
        'pesky', 'painful', 'pithy', 'palpable', 'pro', 'pointy', 'potent',
        'purring', 'proud', 'pensive', 'prismal', 'plump', 'pagan', 'preaching'
    ],
    o: [
        'oxygen', 'octopus', 'orwell', 'oxymoron', 'orbit', 'origami',
        'ontology', 'overture', 'ooze', 'oboe', 'oklahoma', 'old-school',
        'old', 'oil', 'orchid', 'oatmeal', 'oyster', 'olfactory', 'orgasmic',
        'obscene', 'owl', 'oblong', 'obsolete', 'offshoot', 'outlandish'
    ],
    m: [
        'mutator', 'mixer', 'marimba', 'makeover', 'mustache', 'mastiff',
        'mom', 'mustard', 'magnitude', 'milkman', 'molasses', 'mountain',
        'maniac', 'matador', 'mug', 'midget', 'muppet', 'master', 'messiah',
        'madhouse', 'mongoose', 'myopia', 'magnet', 'magic', 'moose'
    ]
};

/**
 * Parses `argv` and returns an options object that is based off the `defaults`
 * options object.
 */
export function parseOptions(argv, defaults) {
    let command = argv[2];
    let optionsArray = argv.slice(2).filter(arg => arg.startsWith('--'));
    let options = _.cloneDeep(defaults);

    if (optionsArray.length === 0) {
        return options;
    }

    if (!defaults.hasOwnProperty(command)) {
        error(`Illegal command '${command}'.`);
        return null;
    }

    _.merge(options, ...optionsArray.map(option => {
        let match = option.match((/^--([a-z-]+)(?:=(.+))?$/));

        if (match) {
            let optionName = camelCase(match[1]);
            let optionValue = match[2] || true;
            let optionCategory =
                (options[command].hasOwnProperty(optionName) && command) ||
                (options['global'].hasOwnProperty(optionName) && 'global');

            if (optionCategory) {
                return {
                    [command]: {
                        [optionName]: optionValue
                    }
                };
            } else {
                error(`Illegal option '${option}'.`);
                return null;
            }
        } else {
            error(`Illegal option syntax '${option}'.`);
            return null;
        }
    }));

    return options;
}

/**
 * Generates the banner that gets displayed when the program is run.
 */
export function randomBanner() {
    let p = taglines.p[_.random(taglines.p.length - 1)],
        o = taglines.o[_.random(taglines.o.length - 1)],
        m = taglines.m[_.random(taglines.m.length - 1)];

    let dashLength = 8 + Math.max(p.length, o.length, m.length) + 8;

    let banner = '\n' +
        chalk.red('      .-') + chalk.blue('_\\W/_') + chalk.red('-.') + chalk.white(`            .${'-'.repeat(dashLength)}.\n`) +
        chalk.red('     /         \\') + chalk.white(`           |${_.pad(p, dashLength)}|\n`) +
        chalk.red('    |    ') + chalk.bold.white('pom') + chalk.red('    |')+ chalk.white(`          |${_.pad(o, dashLength)}|\n`) +
        chalk.red('     \\  ') + chalk.white(version) + chalk.red('  /') + chalk.white(`           |${_.pad(m, dashLength)}|\n`) +
        chalk.red('      \'-.___.-\'') + chalk.white(`            \'${'-'.repeat(dashLength)}\'\n\n`);

    return banner;
}

/**
 * The help text that gets displayed when the user types 'pom help'.
 */
export const helpText = (function () {
    let commands = [
        {
            name: 'pom',
            description: '',
            parameters: [
                {
                    name: '--no-sounds',
                    description: 'Disables all sound notifications.'
                },
                {
                    name: '--no-notifications',
                    description: 'Disables all OS notifications.'
                }
            ]
        },
        {
            name: 'pom start [<name>]',
            description:
                'Starts a pomodoro timer. If a name is given, creates ' +
                'a public pom group with the given name.',
            parameters: [
                {
                    name: '--schedule=<format>',
                    description:
                        'Sets the schedule of the pomodoro. Schedules are ' +
                        'provided in the format of work durations in minutes ' +
                        'followed by break durations in minutes, separated ' +
                        'by dashes. For example, the standard schedule is ' +
                        '25-5-25-5-25-5-25-35.'
                },
                {
                    name: '--start-time=<time>',
                    description:
                        'Specifies that the timer should be started relative ' +
                        'a specific time of the day, regardless of the ' +
                        'current time. The format is <hhmm> in the 24-hour ' +
                        'clock, so 1900 means 7 PM.'
                },
                {
                    name: '--timezone=<timezone>',
                    description:
                        'Specifies the timezone that --start-time is ' +
                        'given in.'
                }
            ]
        },
        {
            name: 'pom connect <name>',
            description: 'Connects to the public pom group of the given name.',
            parameters: []
        },
        {
            name: 'pom serve',
            description: 'Starts a pom server. Currently for internal use only.',
            parameters: []
        },
        {
            name: 'pom help',
            description: 'Displays this help text.',
            parameters: []
        }
    ];

    let introduction =
        `${chalk.bold('pom')} is a tool for synchronizing your work schedule ` +
        'with others. By starting your pomodoro cycles in phase with other ' +
        'people you work with, you can take breaks at the same time and ' +
        'never risk disrupting each other while in "the zone."\n\n' +

        `${chalk.bold('pom')} is also an excellent tool for solo usage, in ` +
        'case normal timers aren\'t geeky enough for you.\n\n';

    let formatCommandName = name => chalk.green(_.padRight(name, 32));
    let formatParamName = param => '    ' + chalk.blue(_.padRight(param, 28));
    let formatDescription = breakLines;

    let commandHelp = commands.map(command =>
        formatCommandName(command.name) +
        formatDescription(command.description) +
        '\n\n' +

        command.parameters.map(param =>
            formatParamName(param.name) +
            formatDescription(param.description) +
            '\n\n'
        ).join('')

    ).join('');

    return (
        breakLines(introduction, 74, 4, true) +
        chalk.bold.white('Help\n') +
        commandHelp
    );
})();

/**
 * Breaks a string into lines of length `lineLength`, optionally with
 * indentation of `indent` number of spaces. If `indentFirst` is true, the
 * first line will be indented as well.
 */
function breakLines(str, lineLength = 46, indent = 32, indentFirst = false) {
    if (str.includes('\n\n')) {
        return str.split('\n\n').map(p =>
            breakLines(p, lineLength, indent, indentFirst)
        ).join('\n\n');
    }

    function sumLengths(arr, index) {
        return _.sum(arr.slice(0, index).map(s => s.length + 1));
    }

    let words = str.split(' ');
    let lineWords = _.takeWhile(words, (val, index, array) =>
        sumLengths(array, index) < lineLength);

    if (lineWords[0] === '') { return ''; }

    let remainder = words.slice(lineWords.length).join(' ');

    if (remainder === '') {
        let line = indentFirst ?
            ' '.repeat(indent) + lineWords.join(' ') :
            lineWords.join(' ');

        return line;
    } else {
        let line = indentFirst ?
            ' '.repeat(indent) + lineWords.join(' ') + '\n' :
            lineWords.join(' ') + '\n' + ' '.repeat(indent);

        return line + breakLines(remainder, lineLength, indent, indentFirst);
    }
}

/**
 * Pretty-prints an error message.
 */
function error(message) {
    console.log(chalk.bgRed(' '.repeat(message.length + 8)));
    console.log(chalk.bgRed(`    ${message}    `));
    console.log(chalk.bgRed(' '.repeat(message.length + 8)) + '\n');
    process.exit(1);
}

export default { parseOptions, randomBanner, helpText, error };
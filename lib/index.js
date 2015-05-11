#! /usr/bin/env babel-node

import {argv} from 'process';
import _ from 'lodash';
import chalk from 'chalk';
import sfx from 'sfx';
import notifier from 'node-notifier';
import moment from 'moment-timezone';
import {jstz as detectTimezone} from 'jstimezonedetect';
import request from 'request';

import cli from './cli';
import serve from './server';

const defaults = {
    global: {
        noSounds: false,
        noNotifications: false
    },
    start: {
        schedule: '25-5-25-5-25-5-25-35',
        startTime: null,
        timezone: null
    }
};

const sounds = {
    workFinished: './assets/up.wav',
    breakFinished: './assets/down.wav'
};

const pomLogo = './assets/pom.svg';

let endpoint = 'http://127.0.0.1:3000/poms/';

let action = argv[2];
let targets = argv.slice(3).filter(s => !s.startsWith('--'));
let options = cli.parseOptions(argv, defaults);
console.log(cli.randomBanner());

if (targets.length > 1) {
    cli.error('Invalid syntax.');
    proess.exit(1);
}

let tz = options.start.timezone || detectTimezone.determine().name();

let playSound = function () {
    if (options.start.noSounds) { return; }
    sfx.play(...arguments);
};

let showNotification = function () {
    if (options.start.noNotifications) { return; }
    notifier.notify(...arguments);
};

if (action === 'start') {
    let startTime = nowTz();
    let schedule = options.start.schedule.split('-').map(Number);
    let noSounds = options.start.noSounds;

    if (options.start.startTime) {
        startTime.set('hour', 10);
        startTime.set('minute', 0);
        startTime = getTodayStartTime(startTime);
    }

    let reporterConfig = {
        startTime,
        schedule,
        playSound,
        showNotification
    };

    let groupName = targets[0];
    if (groupName) {
        request
            .post({
                url: endpoint,
                json: {
                    name: groupName,
                    startTime: options.start.startTime || startTime,
                    schedule: options.start.schedule
                }
            }, function (err, res, body) {
                let object = body;

                if (res.statusCode !== 200) {
                    cli.error(object.message);
                }

                setInterval(pomodoroReporter(reporterConfig), 1000);
            });
    } else {
        setInterval(pomodoroReporter(reporterConfig), 1000);
    }
} else if (action === 'connect') {
    let groupName = targets[0];

    request(endpoint + groupName, function (err, res, body) {
        let object = JSON.parse(body);

        if (res.statusCode !== 200) {
            cli.error(object.message);
        }

        let reporterConfig = {
            schedule: object.schedule.split('-').map(Number),
            startTime: moment(object.startTime),
            playSound,
            showNotification
        };

        setInterval(pomodoroReporter(reporterConfig), 1000);
    });
} else if (action === 'serve') {
    serve();
} else if (action === 'help' || !action) {
    console.log(cli.helpText);
} else {
    console.log(`Unknown command '${action}'. Type ` + chalk.white.bold('pom help') +
        ' for instructions.');
}

function pomodoroReporter({
        startTime,
        schedule,
        playSound,
        showNotification }) {

    let wasWorking = true;

    return function () {
        if (startTime.length === 4) {
            // Wrap startTime over days for uneven schedules
            startTime = getTodayStartTime(startTime);
        }

        let state = pomodoroState({ startTime, schedule });

        if (wasWorking && !state.isWorking) {
            playSound(sounds.workFinished);
            showNotification({
                title: 'Work done',
                message: `Take a ${state.sessionLength} minute break.`
            });
        } else if (!wasWorking && state.isWorking) {
            playSound(sounds.breakFinished);
            showNotification({
                title: 'Back to work',
                message: `${state.sessionLength} minute work session started.`
            });
        }

        wasWorking = state.isWorking;

        process.stdout.clearLine();
        process.stdout.cursorTo(0);

        let timeLeft = state.sessionLength - state.timePassed

        if (state.isWorking) {
            process.stdout.write(
                chalk.cyan(`${moment().format('hh:mm:ss')}`) +
                chalk.blue(' work ') +
                chalk.blue('[') +
                _.padRight('■'.repeat(state.timePassed), state.sessionLength) +
                chalk.blue('] ') +
                `${timeLeft} minutes left.`
            );
        } else if (!state.isWorking) {
            process.stdout.write(
                chalk.cyan(`${moment().format('hh:mm:ss')}`) +
                chalk.green(' break ') +
                chalk.green('[') +
                _.padRight('■'.repeat(state.timePassed), state.sessionLength) +
                chalk.green('] ') +
                `${timeLeft} minutes left.`
            );
        }
    };
}

function pomodoroState({ startTime, schedule }) {
    let isWorking = true;
    let delta = Math.floor(nowTz().diff(startTime) / (60 * 1000));

    for (let i = 0;; i = (i + 1) % schedule.length) {
        // Force reset every cycle for uneven schedules
        if (i === 0) { isWorking = true; }

        if (delta - schedule[i] < 0) {
            return {
                isWorking,
                timePassed: delta,
                sessionLength: schedule[i]
            };
        }

        delta -= schedule[i];
        isWorking = !isWorking;
    }
}

function nowTz() {
    return moment.tz(tz);
}

function getTodayStartTime(startTime) {
    let newStartTime = nowTz();
    newStartTime.set('hour', startTime.get('hour'));
    newStartTime.set('minute', startTime.get('minute'));
    if (nowTz().diff(newStartTime) < 0) {
        newStartTime.subtract(1, 'd');
    }

    return newStartTime;
}
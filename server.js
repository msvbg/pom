import express from 'express';
import bodyParser from 'body-parser';
import _ from 'lodash';
import moment from 'moment-timezone';

export default function () {
    let app = express();
    app.use(bodyParser.json());

    let poms = {};

    app.post('/poms', function (req, res) {
        let name = req.body.name;
        let startTime = req.body.startTime;
        let schedule = req.body.schedule;

        console.log(req.body);

        if (!_.isString(name) || name.length > 32) {
            return res.status(400).json({
                message: 'The requested name is invalid.'
            });
        }

        if (!_.isNumber(startTime) && !moment(startTime).isValid()) {
            return res.status(400).json({
                message: 'The supplied start time is invalid.'
            });
        }

        if (!_.isString(schedule) ||
            _.size(schedule) > 64 ||
            !/^\d+(-\d+)*$/.test(schedule)) {

            return res.status(400).json({
                message: 'The supplied schedule is invalid.'
            });
        }

        if (poms.hasOwnProperty(name)) {
            return res.status(403).json({
                message: 'The requested name is already in use.'
            });
        }

        poms[name] = {
            name, startTime, schedule,
            lastQueried: Date.now()
        };

        res.json(poms[name]);
    });

    app.get('/poms/:name', function (req, res) {
        let name = req.params.name;

        if (!poms.hasOwnProperty(name)) {
            return res.status(400).json({
                message: 'The requested pom name does not exist.'
            });
        }

        poms[name].lastQueried = Date.now();
        res.json(poms[name]);
    });

    let server = app.listen(3000, function () {
        const lifetime = 60 * 60 * 1000;

        setInterval(function () {
            _.forOwn(poms, function (value, key) {
                if (Date.now() - value.lastQueried > lifetime) {
                    delete poms[key];
                }
            });
        }, 60 * 60 * 1000);
    });
}


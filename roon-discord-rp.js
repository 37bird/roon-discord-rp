/* 
Copyright 2018 615283 (James Conway)

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";

let RoonApi = require('node-roon-api'),
    RoonApiSettings = require('node-roon-api-settings'),
    RoonApiStautus = require('node-roon-api-status'),
    RoonApiTransport = require('node-roon-api-transport'),
    DiscordRPC = require('discord-rpc');

let _core = undefined;
let _transport = undefined;

const clientId = '464873958232162353';
const scopes = ['rpc', 'rpc.api', 'messages.read'];

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({transport: 'ipc'});

rpc.login(clientId, { scopes }).catch(console.error);

let roon = new RoonApi({
    extension_id: 'com.georlegacy.general.roon-discord-rp',
    display_name: 'Discord Rich Presence',
    display_version: '1.0',
    publisher: '615283 (James Conway)',
    email: 'j@wonacy.com',
    website: 'https://www.615283.net',

    core_paired: function (core) {
        _core = core;
        _transport = _core.services.RoonApiTransport;
        console.log(core.core_id,
            core.display_name,
            core.display_version,
            "-",
            "PAIRED");

        _transport.subscribe_zones(function (cmd, data) {
            if (cmd == "Changed") {
                if (data.zones_changed) {
                    data.zones_changed.forEach(zone => {
                        zone.outputs.forEach(output => {
                            if (zone.state === 'stopped') {
                                setActivityStopped();
                                return;
                            }
                            if (zone.state === 'paused') {
                                setActivityPaused(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2);
                                return;
                            }
                            if (zone.state === 'loading') {
                                setActivityLoading();
                                return;
                            }
                            if (zone.state === 'playing') {
                                setActivity(zone.now_playing.two_line.line1, zone.now_playing.two_line.line2, zone.now_playing.length, zone.now_playing.seek_position);
                                return;
                            }
                        });
                    });
                }
            }

        });

    },

    core_unpaired: function (core) {
        _core = undefined;
        _transport = undefined;
        console.log(core.core_id,
            core.display_name,
            core.display_version,
            "-",
            "LOST");
    }
})

async function setActivity(line1, line2, songLength, currentSeek) {

    let startTimestamp = (new Date().getTime() / 1000) - currentSeek;
    let endTimestamp = startTimestamp + songLength;

    rpc.setActivity({
        details: line1,
        state: line2,
        startTimestamp,
        endTimestamp,
        largeImageKey: 'roon-main',
        largeImageText: 'Listening with Roon.',
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    });

}

async function setActivityLoading() {

    rpc.setActivity({
        details: 'Loading...',
        state: line2,
        largeImageKey: 'roon-main',
        largeImageText: 'Loading in Roon.',
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    });

}

async setActivityPaused(line1, line2) => {

    rpc.setActivity({
        details: '[Paused] ' + line1,
        state: line2,
        largeImageKey: 'roon-main',
        largeImageText: 'Paused on Roon.',
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    });

}

async setActivityStopped() => {

    rpc.setActivity({
        details: 'Not listening',
        largeImageKey: 'roon-main',
        largeImageText: 'Idling in Roon',
        smallImageKey: 'roon-small',
        smallImageText: 'Roon',
        instance: false,
    })

}

roon.init_services({
    required_services: [RoonApiTransport]
});

roon.start_discovery();

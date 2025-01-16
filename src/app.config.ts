import config from "@colyseus/tools";
import { auth } from "@colyseus/auth";
import path from 'path';
import express from 'express';

import { StateHandlerRoom } from "./rooms/state-handler";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {

        gameServer.define("state_handler", StateHandlerRoom)
            .enableRealtimeListing();

        gameServer.onShutdown(function () {
            console.log(`game server is going down.`);
        });
    },

    initializeExpress: (app) => {
        app.use(auth.prefix, auth.routes());

        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/server-control.html'));
        });

        app.use(express.static(path.join(__dirname, '../public')));
    },

    beforeListen: () => {
    }
});

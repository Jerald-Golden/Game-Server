import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { auth } from "@colyseus/auth";
import path from 'path';
import serveIndex from 'serve-index';
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

        app.use('/colyseus', monitor());

        app.use('/', serveIndex(path.join(__dirname, "../public"), { 'icons': true }))
        app.use('/', express.static(path.join(__dirname, "../public")));
    },


    beforeListen: () => {
    }
});

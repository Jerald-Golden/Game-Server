import config from "@colyseus/tools";

import { RoomHandler } from "./rooms/room-handler";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {

        gameServer.define("Room_handler", RoomHandler)
            .enableRealtimeListing();

        gameServer.onShutdown(function () {
            console.log(`game server is going down.`);
        });
    }
});

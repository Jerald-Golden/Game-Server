import config from "@colyseus/tools";

import { LobbyHandler } from "./handlers/lobby-handler";
import { RoomHandler } from "./handlers/room-handler";

export default config({
    options: {
        devMode: true,
    },

    initializeGameServer: (gameServer) => {

        gameServer.define("lobby_handler", LobbyHandler);

        gameServer.define("Room_handler", RoomHandler)
            .enableRealtimeListing();

        gameServer.onShutdown(function () {
            console.log(`game server is going down.`);
        });
    }
});

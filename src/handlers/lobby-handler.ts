import { Schema, type } from "@colyseus/schema";
import { Client, LobbyRoom } from "colyseus";

class LobbyState extends Schema {
    @type("string") clients: string;
}

export class LobbyHandler extends LobbyRoom {

    async onCreate(options) {
        await super.onCreate(options);

        this.setState(new LobbyState());
    }

    onJoin(client: Client, options) {
        super.onJoin(client, options);
        this.state.clients = client.sessionId;
    }

    onLeave(client) {
        super.onLeave(client);
    }
}
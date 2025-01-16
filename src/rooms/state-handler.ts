import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

class Vector3 extends Schema {
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("float32") z: number = 0;
}

// Player class to store position and rotation
export class Player extends Schema {
    @type(Vector3) position = new Vector3();
    @type(Vector3) rotation = new Vector3();
}

// Game state class to manage players
export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    // Creates a new player with initial position and rotation
    createPlayer(sessionId: string) {
        this.players.set(sessionId, new Player());
    }

    // Removes a player when they leave
    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    // Updates player's position and rotation based on client input
    movePlayer(sessionId: string, movement: { position: { x: number, y: number, z: number }, rotation: { x: number, y: number, z: number } }) {
        const player = this.players.get(sessionId);
        if (player) {
            player.position.x = movement.position.x;
            player.position.y = movement.position.y;
            player.position.z = movement.position.z;

            player.rotation.x = movement.rotation.x;
            player.rotation.y = movement.rotation.y;
            player.rotation.z = movement.rotation.z;
        }
    }
}

// Room class to handle multiplayer logic
export class StateHandlerRoom extends Room<State> {
    maxClients = 10;

    onCreate(options: any) {
        console.log("StateHandlerRoom created!", options);

        // Initialize state
        this.setState(new State());

        // Listen for player movement and rotation updates
        this.onMessage("move", (client: Client, data: any) => {
            console.log('data: ', data);
            // Update the state of the player who sent the message
            this.state.movePlayer(client.sessionId, data);

            // Broadcast to all other players except the sender
            this.broadcast("playerMoved", { id: client.sessionId, position: data.position, rotation: data.rotation }, { except: client });
        });

        // Handle kick requests
        this.onMessage("kick", (client: Client, data: { sessionId: string }) => {
            const sessionIdToKick = data.sessionId;

            // Example condition: Only observers can send "kick" requests
            if (this.state.players.get(client.sessionId) === undefined) {
                const targetClient = this.clients.find(c => c.sessionId === sessionIdToKick);

                if (targetClient) {
                    targetClient.leave(); // Disconnect the targeted client
                    console.log(`Player ${sessionIdToKick} was kicked by ${client.sessionId}`);
                } else {
                    console.log(`Invalid kick request for ${sessionIdToKick}`);
                }
            } else {
                console.log(`Unauthorized kick attempt by ${client.sessionId}`);
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined with options:", options);

        if (options.role === "player") {
            this.state.createPlayer(client.sessionId);
            console.log(`Player ${client.sessionId} added to the game`);
        } else {
            console.log(`Observer ${client.sessionId} joined`);
        }
    }

    onLeave(client: Client) {
        console.log(client.sessionId, "left!");
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
}

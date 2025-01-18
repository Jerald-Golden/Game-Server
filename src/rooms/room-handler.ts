import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// Vector3 class to represent positions and rotations
class Vector3 extends Schema {
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("float32") z: number = 0;
}

// Player class to store position, rotation, and name
export class Player extends Schema {
    @type(Vector3) position = new Vector3();
    @type(Vector3) rotation = new Vector3();
    @type("string") name: string = "";
}

// Game state class to manage players
export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    // Creates a new player with initial position, rotation, and name
    createPlayer(sessionId: string, name: string) {
        const uniqueName = this.getUniqueName(name);
        const player = new Player();
        player.name = uniqueName;
        this.players.set(sessionId, player);
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

    // Ensures name uniqueness by appending a number if needed
    getUniqueName(name: string): string {
        let uniqueName = name;
        let count = 1;
        const names = Array.from(this.players.values()).map(player => player.name);

        while (names.includes(uniqueName)) {
            uniqueName = `${name} (${count++})`;
        }

        return uniqueName;
    }
}

// Combined Room class to handle chat and state
export class RoomHandler extends Room<State> {
    maxClients = parseInt(process.env.REACT_APP_MAX_CLIENT);

    // Store client session IDs and roles
    clientRoles: Map<string, string> = new Map();
    clientNames: Map<string, string> = new Map();

    onCreate(options: any) {
        console.log("Room created!", options);

        // Initialize state
        this.setState(new State());

        // Handle chat messages
        this.onMessage("message", (client, data) => {
            const name = this.clientNames.get(client.sessionId) || "observer";

            // Send structured data with the correct sender name
            this.broadcast("chat", { sender: name, message: data.message }, { except: client });
        });

        // Listen for player movement and rotation updates
        this.onMessage("move", (client: Client, data: any) => {
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

        // Store the client session ID and role
        if (options.role) {
            this.clientRoles.set(client.sessionId, options.role);
        }

        // Store the client's name or assign a default one
        const name = options.name || "Observer";
        this.clientNames.set(client.sessionId, name);

        if (options.role === "player") {
            // Add player to the game state
            this.state.createPlayer(client.sessionId, name);

            // Notify all players about the new player joining
            this.broadcast("chat", { sender: "system", message: `${name} : joined the chat.` });
        } else if (options.role === "observer") {
            console.log(`Observer ${client.sessionId} added to the server control`);
        }
    }

    onLeave(client: Client) {
        console.log(client.sessionId, "left!");

        // Retrieve the name and role from the maps
        const clientRole = this.clientRoles.get(client.sessionId);
        const name = this.clientNames.get(client.sessionId) || client.sessionId;

        if (clientRole === "player") {
            // Notify all players about the player leaving
            this.broadcast("chat", { sender: "system", message: `${name} : left the chat.` });

            // Remove player from the game state
            this.state.removePlayer(client.sessionId);
        } else if (clientRole === "observer") {
            console.log(`Observer ${client.sessionId} disconnected`);
        }

        // Clean up the client data
        this.clientRoles.delete(client.sessionId);
        this.clientNames.delete(client.sessionId);
    }

    onDispose() {
        console.log("Dispose Room");
    }
}

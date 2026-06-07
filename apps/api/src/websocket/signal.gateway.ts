import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class SignalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('join_commune')
  handleJoinCommune(@ConnectedSocket() client: Socket, communeId: string) {
    client.join(`commune:${communeId}`);
  }

  // Méthodes appelées par d'autres services pour broadcaster
  emitNewIncident(communeId: string, incident: any) {
    this.server.to(`commune:${communeId}`).emit('new_incident', incident);
  }

  emitStatusUpdate(communeId: string, update: { incidentId: string; status: string }) {
    this.server.to(`commune:${communeId}`).emit('status_update', update);
  }
}

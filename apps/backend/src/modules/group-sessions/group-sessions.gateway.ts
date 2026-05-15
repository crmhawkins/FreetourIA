import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GroupSessionsService } from './group-sessions.service';

@WebSocketGateway({
    cors: {
        origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
            const allowedOrigins = process.env.ALLOWED_ORIGINS
                ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
                : [];
            if (!origin || process.env.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new Error('WebSocket origin not allowed'));
        },
        credentials: true,
    },
})
export class GroupSessionsGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private groupSessionsService: GroupSessionsService,
        private jwtService: JwtService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (token) {
                const payload = this.jwtService.verify(token);
                (client as any).userId = payload.sub;
                console.log(`Client connected: ${client.id} (user: ${payload.sub})`);
            } else {
                console.log(`Client connected: ${client.id} (anonymous)`);
            }
        } catch (error) {
            console.log(`Client connected with invalid token: ${client.id}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinSession')
    async handleJoinSession(
        @MessageBody() data: { sessionId: string; userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const session = await this.groupSessionsService.getSession(data.sessionId);

        if (!session) {
            return { error: 'Session not found' };
        }

        client.join(data.sessionId);

        this.server.to(data.sessionId).emit('memberJoined', {
            userId: data.userId,
            timestamp: new Date(),
        });

        return { success: true, session };
    }

    @SubscribeMessage('updatePoint')
    async handleUpdatePoint(
        @MessageBody()
        data: { sessionId: string; pointId: string },
        @ConnectedSocket() client: Socket,
    ) {
        // Verify host from server-side
        const session = await this.groupSessionsService.getSession(data.sessionId);
        const authenticatedUserId = (client as any).userId;

        if (!session || session.hostUserId !== authenticatedUserId) {
            return { error: 'Only the host can update the current point' };
        }

        await this.groupSessionsService.updateSession(data.sessionId, {
            currentPointId: data.pointId,
        });

        this.server.to(data.sessionId).emit('pointUpdated', {
            pointId: data.pointId,
            timestamp: new Date(),
        });

        return { success: true };
    }

    @SubscribeMessage('updateStatus')
    async handleUpdateStatus(
        @MessageBody()
        data: { sessionId: string; status: string },
        @ConnectedSocket() client: Socket,
    ) {
        const session = await this.groupSessionsService.getSession(data.sessionId);
        const authenticatedUserId = (client as any).userId;

        if (!session || session.hostUserId !== authenticatedUserId) {
            return { error: 'Only the host can update the session status' };
        }

        await this.groupSessionsService.updateSession(data.sessionId, {
            status: data.status,
        });

        this.server.to(data.sessionId).emit('statusUpdated', {
            status: data.status,
            timestamp: new Date(),
        });

        return { success: true };
    }

    @SubscribeMessage('leaveSession')
    handleLeaveSession(
        @MessageBody() data: { sessionId: string; userId: string },
        @ConnectedSocket() client: Socket,
    ) {
        client.leave(data.sessionId);

        this.server.to(data.sessionId).emit('memberLeft', {
            userId: data.userId,
            timestamp: new Date(),
        });

        return { success: true };
    }
}

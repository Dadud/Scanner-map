import { FastifyPluginAsync } from 'fastify';

export const WebhookRouter: FastifyPluginAsync = async (fastify) => {
  fastify.post('/call-upload', async (request, reply) => {
    const { talkgroupId, timestamp, audioUrl, category, apiKey } = request.body as any;

    if (!audioUrl) return reply.status(400).send({ error: 'Audio URL required' });

    const call = await fastify.prisma.call.create({
      data: {
        talkgroupId: talkgroupId || 'unknown',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        audioUrl, category: category || 'unknown'
      },
      include: { talkgroup: true }
    });

    await fastify.redisPub.publish('calls:new', JSON.stringify(call));
    await fastify.redisPub.publish('transcription:request', JSON.stringify({
      callId: call.id, audioUrl, talkgroupId
    }));

    return reply.status(201).send({ success: true, callId: call.id });
  });
};
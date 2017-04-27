import * as temperature from './temperature'
import * as context from './context'

function* onMessage(message : SlackMessage & temperature.Response & context.Response) : Iterator<Promise<MinionResult>> {


	if(message.channel.is_group || message.channel.is_mpim) {
		return false;
	}

	return {
		text: `temperature of ${message.channel.name}: ${message.temperature.raw_temperature}`,
		channelOverride: 'C2E8ZNS4X',
		send: true,
		threadReply: false
	}

}

const mod : MinionModule = {
	key: 'temp_debug',
	requirements: ['temperature', 'context'],
	onMessage
}

export default mod;
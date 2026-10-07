import React from 'react';
import {Composition} from 'remotion';
import {AiAgentsVideo} from './AiAgentsVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="AiAgentsExplainer"
		component={AiAgentsVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);

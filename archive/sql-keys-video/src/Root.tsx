import React from 'react';
import {Composition} from 'remotion';
import {SqlKeysVideo} from './SqlKeysVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlKeysExplainer"
		component={SqlKeysVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);

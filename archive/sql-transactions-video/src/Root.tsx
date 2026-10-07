import React from 'react';
import {Composition} from 'remotion';
import {SqlTransactionsVideo} from './SqlTransactionsVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SqlTransactionsExplainer"
		component={SqlTransactionsVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);

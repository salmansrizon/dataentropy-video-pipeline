import React from 'react';
import {Composition} from 'remotion';
import {RagVideo} from './RagVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="RagExplainer"
		component={RagVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);

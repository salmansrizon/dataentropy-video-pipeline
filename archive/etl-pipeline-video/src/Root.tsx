import React from 'react';
import {Composition} from 'remotion';
import {EtlPipelineVideo} from './EtlPipelineVideo';
import content from './content.json';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="EtlPipelineExplainer"
		component={EtlPipelineVideo}
		durationInFrames={content.durationSeconds * content.fps}
		fps={content.fps}
		width={1080}
		height={1920}
	/>
);

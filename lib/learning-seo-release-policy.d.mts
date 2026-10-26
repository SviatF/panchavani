export type ReleasedLearningRoute={
 path:string;lastModified:string;kind:'approved-learning-guide';sourceIds:string[];
};
export declare function hashLearningGuide(guide:unknown):string;
export declare function learningSeoPath(slug:string):string;
export declare function validateLearningSeoRelease(
 manifest:unknown,guides:Record<string,unknown>,expectedSha:string|undefined
):ReleasedLearningRoute[];

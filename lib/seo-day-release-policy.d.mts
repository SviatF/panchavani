export type ApprovedDailySeoRoute={
 path:string;lastModified:string;kind:'approved-daily-panchang';sourceIds:string[];
};
export declare function seoDayPath(city:string,date:string):string;
export declare function validateSeoDayRelease(
 manifest:unknown,approvedDays:unknown[],expectedDigest:string|undefined
):ApprovedDailySeoRoute[];

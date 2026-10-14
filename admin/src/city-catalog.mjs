/** Shared research catalogue, bundled directly from the Python engine source.
 * NO admin-side city list, no automatic approval and no public catalogue API.
 */
import catalog from '../../engine/catalog/cities.v1.json' with {type:'json'};

if(catalog.schemaVersion!==1||catalog.country!=='IN'||
   typeof catalog.catalogVersion!=='string'||!catalog.catalogVersion.includes('unverified')||
   !Array.isArray(catalog.cities)||catalog.cities.length===0){
  throw new Error('Unsupported or unsafe PANCHAVANI research catalogue');
}
const seen = new Set();
export const ACTIVE_CITIES = Object.freeze(catalog.cities
  .filter(c=>{
    if(typeof c.id!=='string'||!(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/).test(c.id)||seen.has(c.id)){
      throw new Error('Invalid or duplicate PANCHAVANI city slug');
    }
    seen.add(c.id);
    if(c.coordinatesVerified!==false||c.publishingApproved!==false||
       typeof c.researchEnabled!=='boolean'){
      throw new Error('Research city illegally marked approved');
    }
    return c.researchEnabled;
  }).map(c=>Object.freeze({
    id:c.id,name:c.name,timezone:c.timezone,
    latitude:c.latitude,longitude:c.longitude,elevationMeters:c.elevationMeters
  }))
  .sort((a,b)=>a.id.localeCompare(b.id)));
export const CITY_IDS = new Set(ACTIVE_CITIES.map(c=>c.id));
export const CITY_META = new Map(ACTIVE_CITIES.map(c=>[c.id,c]));
export const CATALOG_VERSION = catalog.catalogVersion;

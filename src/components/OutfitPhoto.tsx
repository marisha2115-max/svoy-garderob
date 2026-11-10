import {canShowSilhouette} from '../presentation';
import {useEffect,useState} from 'react';import type {Item,Outfit} from '../domain';import type {ClosetStore} from '../storage';
export function OutfitPhoto({item,store,version,viewMode}:{item:Item;store:ClosetStore;version:number;viewMode:Outfit['viewMode']}){
 const [fallback,setFallback]=useState(false);
 const [state,setState]=useState<{url:string;cutout:boolean}>({url:'',cutout:false});
 useEffect(()=>{let live=true,url='';setState({url:'',cutout:false});void(async()=>{const eligible=viewMode==='silhouettes'&&canShowSilhouette(item);if(!eligible&&!fallback){const http=await store.getPhotoUrl?.(item.id,'preferred');if(http){if(live)setState({url:http,cutout:false});return}}let blob=eligible?await store.getCutoutPhoto(item.id):undefined;const cutout=!!blob;if(!blob)blob=await store.getPreferredPhoto(item.id);if(live&&blob){url=URL.createObjectURL(blob);setState({url,cutout})}})().catch(()=>{});return()=>{live=false;if(url)URL.revokeObjectURL(url)}},[item.id,item.backgroundFailed,item.backgroundReport,item.cutoutApproved,item.photoPreference,viewMode,store,version,fallback]);
 return <span className={`outfit-image ${state.cutout?'is-silhouette':'is-photo'}`}>{state.url?<img src={state.url} alt={item.name} loading="lazy" onError={()=>{if(!fallback)setFallback(true);else setState({url:'',cutout:false})}} style={{objectFit:'contain',objectPosition:'center'}}/>:<span className="photo-placeholder">Фото недоступно</span>}</span>;
}

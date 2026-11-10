import {categories,type Category} from '../domain';
export function CategoryChoices({value,onChange,disabled=false,label='Категория вещи'}:{value:Category;onChange:(category:Category)=>void;disabled?:boolean;label?:string}){
 return <div role="group" aria-label={label} className="category-choices">{value==='unknown'&&<p className="small muted">Выберите категорию</p>}<div className="category-choice-buttons">{Object.entries(categories).filter(([k])=>k!=='unknown').map(([key,text])=><button key={key} type="button" className={value===key?'chip active':'chip'} aria-pressed={value===key} disabled={disabled} onClick={()=>onChange(key as Category)}>{text}</button>)}</div></div>;
}

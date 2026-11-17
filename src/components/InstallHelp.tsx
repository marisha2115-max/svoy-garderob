import {useEffect,useState} from 'react';
import {canPromptInstall,detectDevice,isInstalled,onInstallChange,promptInstall,type Device} from '../install';
import {Modal} from './Modal';
export function useInstallState(){
 const [, redraw]=useState(0);useEffect(()=>onInstallChange(()=>redraw(n=>n+1)),[]);
 return {installed:isInstalled(),device:detectDevice(),canPrompt:canPromptInstall()};
}
const appLink=()=>location.origin+location.pathname;
function Steps({device}:{device:Device}){
 if(device==='iphone')return <ol className="install-steps">
  <li>Внизу экрана нажмите <b>«Поделиться»</b> — квадрат со стрелкой вверх.</li>
  <li>Пролистайте вниз и выберите <b>«На экран „Домой“»</b>.</li>
  <li>Нажмите <b>«Добавить»</b>. Дальше открывайте приложение значком на экране.</li>
 </ol>;
 if(device==='iphone-other-browser')return <ol className="install-steps">
  <li>Скопируйте ссылку кнопкой ниже.</li>
  <li>Откройте её в <b>Safari</b> — на iPhone ставить на экран надёжнее всего из него.</li>
  <li>В Safari: <b>«Поделиться»</b> → <b>«На экран „Домой“»</b> → <b>«Добавить»</b>.</li>
 </ol>;
 if(device==='android')return <ol className="install-steps">
  <li>Откройте ссылку в <b>Chrome</b>.</li>
  <li>Нажмите <b>три точки</b> справа вверху.</li>
  <li>Выберите <b>«Установить приложение»</b> или <b>«Добавить на главный экран»</b>, затем <b>«Установить»</b>.</li>
 </ol>;
 return <ol className="install-steps">
  <li>Откройте эту ссылку на телефоне — можно отправить её себе в мессенджер.</li>
  <li>На iPhone — в Safari: <b>«Поделиться»</b> → <b>«На экран „Домой“»</b>.</li>
  <li>На Android — в Chrome: <b>три точки</b> → <b>«Установить приложение»</b>.</li>
 </ol>;
}
export function InstallHelp({onClose,onBackup,hasItems}:{onClose:()=>void;onBackup:()=>void;hasItems:boolean}){
 const {installed,device,canPrompt}=useInstallState(),[copied,setCopied]=useState('');
 async function copyLink(){try{await navigator.clipboard.writeText(appLink());setCopied('Ссылка скопирована')}catch{setCopied('Не получилось — выделите ссылку и скопируйте вручную')}}
 return <Modal title="Установить на телефон" onClose={onClose}>
  {installed?<p>Приложение уже стоит на экране телефона — вы открыли его со значка.</p>:<>
   <p className="small muted">Скачивать из магазина не нужно: значок появится на экране, приложение будет открываться отдельно и работать без интернета.</p>
   {canPrompt&&<button className="button primary full" onClick={()=>void promptInstall()}>Установить</button>}
   <Steps device={device}/>
   {device!=='iphone'&&device!=='android'&&<p className="install-link">{appLink()}</p>}
   <button className="button secondary full" onClick={()=>void copyLink()}>{copied||'Скопировать ссылку'}</button>
   {(device==='iphone'||device==='iphone-other-browser')&&hasItems&&<div className="install-note"><p className="small">На iPhone приложение на экране «Домой» хранит вещи отдельно от Safari. Чтобы перенести уже добавленные вещи, сначала сохраните копию, а потом откройте её в приложении со значка: «⋯» → «Копия и перенос» → «Добавить копию».</p><button className="link-button" onClick={onBackup}>Сохранить копию</button></div>}
  </>}
  <h3 className="idea-heading">Как пользоваться</h3>
  <ul className="install-guide">
   <li><b>«+»</b> вверху — добавить вещи с фото. Однотонный фон уберётся сам.</li>
   <li><b>Сегодня</b> — образ дня по температуре. «Другой» — следующий вариант.</li>
   <li><b>Гардероб</b> — все вещи. Нажмите на вещь, чтобы изменить, удалить или продать.</li>
   <li><b>Образы</b> — подбор по поводу или сборка вручную.</li>
   <li><b>Идеи</b> — капсула, чего не хватает, разбор шкафа, чемодан.</li>
   <li>Вещи хранятся только в этом телефоне. Время от времени сохраняйте копию: «⋯» → «Копия и перенос».</li>
  </ul>
 </Modal>
}

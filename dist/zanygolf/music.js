export const TRACKS=['windmill','hamburger','walls','pinball','fans','carpet','castle','anthill','energy','mystery'];
export function createMusic(makeAudio=()=>new Audio()){
  let audio=null,current=-1,enabled=true,volume=.3,revision=0;
  return {
    get enabled(){return enabled;},get volume(){return volume;},
    setEnabled(value){revision++;enabled=!!value;if(!enabled)audio?.pause();},
    setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(audio)audio.volume=volume;},
    async sync(index,playing){
      const ticket=++revision;
      if(!enabled||!playing){audio?.pause();return;}
      if(!TRACKS[index])return;
      audio??=makeAudio();audio.loop=true;audio.volume=volume;audio.preload='none';
      if(current!==index){audio.pause();audio.src=new URL('./music/'+TRACKS[index]+'.mp3',document.baseURI).href;current=index;audio.load();}
      if(audio.paused)try{await audio.play();}catch(error){if(ticket===revision)throw error;}
    },
  };
}

export function createCharge(){
  let active=false,power=5;
  return {
    get active(){return active;},get power(){return power;},
    start(){if(active)return false;active=true;power=5;return true;},
    tick(seconds){if(active)power=Math.min(100,power+Math.max(0,seconds)*65);return power;},
    release(){if(!active)return null;active=false;return power;},
    cancel(){active=false;},
  };
}

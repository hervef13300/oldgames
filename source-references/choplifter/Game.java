package com.provencecloud.choplifter;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** Deterministic simulation. Positions are logical pixels; durations are seconds. */
public final class Game implements Serializable {
    private static final long serialVersionUID = 4L;
    public static final float WORLD=3600, FLOOR=390, LAND_Y=370, BASE=160, BARRIER=430;
    public static final int CAPACITY=16, TOTAL=64;
    public enum Mode { CLASSIC, ASSISTED }
    public enum State { HELD, FREE, ONBOARD, SAVED, DEAD }
    public enum Sound { FIRE, OPEN, BOARD, SAVE, EXPLOSION, WIN }
    public static final class Person implements Serializable {
        public float x; public final int group; public State state=State.HELD;
        Person(float x,int group){this.x=x;this.group=group;}
    }
    public static final class Building implements Serializable {
        public final float x; public boolean open;
        Building(float x){this.x=x;}
    }
    public static final class Tank implements Serializable {
        public final float home; public float x; public int hp=2; public float timer=2;
        Tank(float x){this.x=x;home=x;}
    }
    public static final class Jet implements Serializable {
        public float x,y,vx,timer=.8f,ttl=9;public int hp=1;
        Jet(float x,float y,float vx){this.x=x;this.y=y;this.vx=vx;}
    }
    public static final class Mine implements Serializable {
        public float x,y,vx,vy,ttl=40;public int hp=1;
        Mine(float x,float y){this.x=x;this.y=y;}
    }
    public static final class Shot implements Serializable {
        public float x,y,oldX,oldY,vx,vy,ttl=4; public final boolean enemy;
        public final boolean bomb;
        Shot(float x,float y,float vx,float vy,boolean enemy){this(x,y,vx,vy,enemy,false);}
        Shot(float x,float y,float vx,float vy,boolean enemy,boolean bomb){
            this.x=oldX=x;this.y=oldY=y;this.vx=vx;this.vy=vy;this.enemy=enemy;this.bomb=bomb;
        }
    }
    public final Mode mode;
    public final List<Person> people=new ArrayList<>();
    public final List<Building> buildings=new ArrayList<>();
    public final List<Tank> tanks=new ArrayList<>();
    public final List<Shot> shots=new ArrayList<>();
    public final List<Jet> jets=new ArrayList<>();
    public final List<Mine> mines=new ArrayList<>();
    public float jetCountdown=18,mineCountdown=42,warningTime;
    public String warning="";
    private int wave;
    public final List<Sound> sounds=new ArrayList<>();
    public float x=BASE,y=LAND_Y,vx,vy,time,crashTimer,invulnerable;
    /** -1 = left, 0 = front/tank attack, +1 = right; independent of velocity. */
    public int facing=1,hp=100,lives=3,sorties;
    public boolean started,paused=true,over;
    public String message="Première caserne ouverte · décollez";
    public float messageTime=5;
    private float cooldown,transfer,stableTime;
    private boolean unloading;
    public Game(){this(Mode.CLASSIC);}
    public Game(Mode mode){
        this.mode=mode;
        for(int i=0;i<4;i++){
            float bx=850+i*760;buildings.add(new Building(bx));
            for(int j=0;j<16;j++)people.add(new Person(bx+(j-7.5f)*5,i));
            tanks.add(new Tank(bx+210));
        }
        buildings.get(0).open=true;
        for(Person p:people)if(p.group==0)p.state=State.FREE;
    }
    public int count(State state){int n=0;for(Person p:people)if(p.state==state)n++;return n;}
    public int activeBuilding(){
        for(int i=0;i<4;i++)for(Person p:people)
            if(p.group==i&&p.state!=State.SAVED&&p.state!=State.DEAD)return i;
        return 4;
    }
    public int waiting(int group){int n=0;for(Person p:people)if(p.group==group&&p.state==State.FREE)n++;return n;}
    public float tilt(){return Math.max(-18,Math.min(18,vx/12));}
    public boolean landed(){return crashTimer<=0&&y>=LAND_Y-.1f&&Math.abs(vx)<30&&Math.abs(vy)<1;}
    public void orient(int direction){if(direction>=-1&&direction<=1)facing=direction;}
    public void start(){started=true;paused=false;}
    private void event(Sound sound){if(sounds.size()<32)sounds.add(sound);}
    private void say(String s){message=s;messageTime=4;}
    public boolean free(int index){
        if(index<0||index>=4||buildings.get(index).open)return false;
        if(index!=activeBuilding()){say("Ramenez d’abord le groupe précédent");return false;}
        buildings.get(index).open=true;
        for(Person p:people)if(p.group==index&&p.state==State.HELD)p.state=State.FREE;
        say("Caserne ouverte · posez-vous à côté");event(Sound.OPEN);return true;
    }
    public boolean board(Person p){
        if(p.state!=State.FREE||count(State.ONBOARD)>=CAPACITY||!landed()||Math.abs(p.x-x)>46)return false;
        p.state=State.ONBOARD;event(Sound.BOARD);return true;
    }
    public void damage(int amount){
        if(over||crashTimer>0||invulnerable>0)return;
        hp=mode==Mode.CLASSIC?0:Math.max(0,hp-amount);
        if(hp>0)return;
        for(Person p:people)if(p.state==State.ONBOARD)p.state=State.DEAD;
        lives--;event(Sound.EXPLOSION);crashTimer=2.2f;vx=vy=0;unloading=false;
        say(lives>0?"Appareil perdu · retour à la base":"THE END · plus d’hélicoptère");
        if(lives==0)over=true;
    }
    public void update(float elapsed,float ax,float ay,boolean firing){
        if(paused||over||!started)return;
        float remaining=Math.max(0,Math.min(elapsed,.25f));
        while(remaining>.00001f&&!over){float dt=Math.min(remaining,1/120f);step(dt,ax,ay,firing);remaining-=dt;}
    }
    private void step(float dt,float ax,float ay,boolean firing){
        time+=dt;cooldown-=dt;transfer+=dt;messageTime=Math.max(0,messageTime-dt);
        invulnerable=Math.max(0,invulnerable-dt);warningTime=Math.max(0,warningTime-dt);
        if(crashTimer>0){
            crashTimer-=dt;
            if(crashTimer<=0){x=BASE;y=LAND_Y;vx=vy=0;hp=100;invulnerable=2;shots.clear();stableTime=0;}
            finishIfResolved();return;
        }
        ax=Math.max(-1,Math.min(1,ax));ay=Math.max(-1,Math.min(1,ay));
        vx+=(ax*230-vx)*(1-(float)Math.exp(-(Math.abs(ax)>.05?3.8:6)*dt));
        vy+=(ay*165-vy)*(1-(float)Math.exp(-5*dt));
        float oldY=y;
        x=Math.max(35,Math.min(WORLD-35,x+vx*dt));
        y=Math.max(100,Math.min(LAND_Y,y+vy*dt));
        if(y>=LAND_Y){
            if(oldY<LAND_Y-.001f){
                if(vy>105||Math.abs(vx)>100){damage(35);say("Atterrissage brutal · ralentissez");}
                for(Person p:people)if(p.state==State.FREE&&Math.abs(p.x-x)<25)p.state=State.DEAD;
            }
            vy=0;
        }
        // Barrack roofs and the post office are solid; land beside them.
        if(y>313&&y<LAND_Y-1){
            for(Building b:buildings)if(Math.abs(x-b.x)<76){damage(100);break;}
            if(x<90&&y>330)damage(100);
        }
        if(crashTimer>0||over)return;
        stableTime=landed()?stableTime+dt:0;
        if(firing&&cooldown<=0&&!landed()){
            if(facing==0)shots.add(new Shot(x,y+22,0,430,false));
            else shots.add(new Shot(x+facing*32,y+2,facing*560,0,false));
            cooldown=.20f;event(Sound.FIRE);
        }
        updateShots(dt);
        if(crashTimer>0||over)return;
        updateEnemies(dt);
        if(crashTimer>0||over)return;
        if(stableTime>.25f){
            if(Math.abs(x-BASE)<105){
                if(count(State.ONBOARD)>0){
                    unloading=true;
                    if(transfer>.12f)for(Person p:people)if(p.state==State.ONBOARD){
                        p.state=State.SAVED;p.x=BASE-100+count(State.SAVED)%12*8;transfer=0;event(Sound.SAVE);break;
                    }
                    say("Débarquement · "+count(State.SAVED)+" en sécurité");
                }else if(unloading){sorties++;unloading=false;say("Groupe sauvé · caserne suivante");}
                if(mode==Mode.ASSISTED)hp=Math.min(100,hp+1);
            }else{
                for(Person p:people)if(p.state==State.FREE&&Math.abs(p.x-x)<210&&count(State.ONBOARD)<CAPACITY){
                    float target=x+(p.x<x?-38:38),delta=target-p.x;
                    p.x+=Math.signum(delta)*Math.min(Math.abs(delta),42*dt);
                    if(transfer>.18f&&board(p)){transfer=0;say(count(State.ONBOARD)==16?"COMPLET · retour à la base":"Embarquement · "+count(State.ONBOARD)+" / 16");}
                }
            }
        }
        finishIfResolved();
    }
    private void finishIfResolved(){
        if(count(State.HELD)+count(State.FREE)+count(State.ONBOARD)==0){
            over=true;message=count(State.SAVED)==TOTAL?"SAUVETAGE PARFAIT":"THE END · mission terminée";event(Sound.WIN);
        }
    }
    public float jetInterval(){return Math.max(7,18-sorties*2);}
    public float mineInterval(){return Math.max(14,34-sorties*4);}
    private void updateEnemies(float dt){
        for(Tank t:tanks){
            t.timer-=dt;
            if(t.hp<=0)continue;
            t.x=t.home+(float)Math.sin(time*.25+t.home)*45;
            if(x>BARRIER&&Math.abs(x-t.x)<600&&y>300&&t.timer<=0){
                shots.add(new Shot(t.x,FLOOR-12,x<t.x?-180:180,0,true));
                t.timer=Math.max(1.15f,3-sorties*.3f);
            }
        }
        jetCountdown-=dt;mineCountdown-=dt;
        if(jetCountdown<2&&jetCountdown>0&&x>BARRIER){warning="AVION EN APPROCHE";warningTime=2;}
        if(jetCountdown<=0&&x>BARRIER){
            boolean fromRight=x<WORLD-650;
            float spawn=fromRight?Math.min(WORLD+60,x+720):Math.max(BARRIER+10,x-720);
            if(jets.size()<2)jets.add(new Jet(spawn,130+(wave++%3)*62,(fromRight?-1:1)*(220+sorties*15)));
            jetCountdown=jetInterval();
        }
        if(mineCountdown<2&&mineCountdown>0){warning="MINE AÉRIENNE EN APPROCHE";warningTime=2;}
        if(mineCountdown<=0){
            if(mines.size()<2)mines.add(new Mine(x<WORLD-650?x+650:x-650,130));
            mineCountdown=mineInterval();
        }
        for(Iterator<Jet> it=jets.iterator();it.hasNext();){
            Jet j=it.next();j.x+=j.vx*dt;j.timer-=dt;j.ttl-=dt;
            if(j.hp>0&&x>BARRIER&&Math.abs(j.x-x)<480&&j.timer<=0){
                if(landed()&&Math.abs(j.x-x)<160)shots.add(new Shot(j.x,j.y+12,j.vx*.12f,100,true,true));
                else{
                    float dx=x+vx*.3f-j.x,dy=y-j.y,len=Math.max(1,(float)Math.hypot(dx,dy));
                    shots.add(new Shot(j.x,j.y,dx/len*230,dy/len*230,true));
                }
                j.timer=1.8f;
            }
            if(j.hp>0&&Math.abs(j.x-x)<38&&Math.abs(j.y-y)<21){damage(100);j.hp=0;event(Sound.EXPLOSION);}
            if(j.hp<=0||j.ttl<=0||j.x<BARRIER||j.x>WORLD+100)it.remove();
        }
        for(Iterator<Mine> it=mines.iterator();it.hasNext();){
            Mine m=it.next();m.ttl-=dt;
            float dx=x-m.x,dy=y-m.y,len=Math.max(1,(float)Math.hypot(dx,dy)),speed=90+sorties*10;
            float blend=1-(float)Math.exp(-2*dt);
            m.vx+=(dx/len*speed-m.vx)*blend;m.vy+=(dy/len*speed-m.vy)*blend;
            m.x+=m.vx*dt;m.y+=m.vy*dt;
            if(m.hp>0&&Math.hypot(m.x-x,m.y-y)<30){damage(100);m.hp=0;event(Sound.EXPLOSION);}
            if(m.hp<=0||m.ttl<=0)it.remove();
        }
    }
    private void updateShots(float dt){
        for(Iterator<Shot> it=shots.iterator();it.hasNext();){
            Shot s=it.next();s.oldX=s.x;s.oldY=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.ttl-=dt;
            if(s.bomb)s.vy+=110*dt;
            boolean hit=false;
            if(s.enemy){
                if(Math.abs(s.x-x)<29&&Math.abs(s.y-y)<17){damage(18);hit=true;}
            }else{
                for(Jet j:jets)if(!hit&&j.hp>0&&Math.abs(s.x-j.x)<35&&Math.abs(s.y-j.y)<14){j.hp=0;hit=true;event(Sound.EXPLOSION);}
                for(Mine m:mines)if(!hit&&m.hp>0&&Math.hypot(s.x-m.x,s.y-m.y)<17){m.hp=0;hit=true;event(Sound.EXPLOSION);}
                for(int i=0;i<4&&!hit;i++){
                    Building b=buildings.get(i);
                    if(!b.open&&Math.abs(s.x-b.x)<56&&s.y>FLOOR-64&&s.y<FLOOR){free(i);hit=true;}
                }
                for(Tank t:tanks)if(!hit&&t.hp>0&&Math.abs(s.x-t.x)<29&&s.y>FLOOR-28&&s.y<FLOOR){
                    if(s.vy>0){t.hp--;if(t.hp==0)event(Sound.EXPLOSION);}hit=true;
                }
            }
            if(!hit&&s.y>FLOOR-17)for(Person p:people)
                if(p.state==State.FREE&&Math.abs(s.x-p.x)<7){p.state=State.DEAD;hit=true;break;}
            // Tanks cannot fire across the treaty barrier.
            if(hit||s.ttl<=0||s.y>FLOOR||s.x<0||s.x>WORLD||(s.enemy&&s.x<BARRIER))it.remove();
        }
    }
}

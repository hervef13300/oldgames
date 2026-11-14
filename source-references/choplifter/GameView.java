package com.provencecloud.choplifter;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.view.Choreographer;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

/** All simulation and touch state belongs to the UI thread. */
public final class GameView extends View implements Choreographer.FrameCallback {
    Game game;
    private final Paint paint=new Paint();
    private final AudioEngine audio;
    private boolean soundEnabled;
    private float scale=1,ox,oy,camera,ax,ay;
    private int stick=-1,fire=-1;
    private boolean drawing,keyFire;
    private long previous;
    private double accumulator;
    private static final int BLACK=0xff070b10, GREEN=0xff62e179, WHITE=0xfff0eedf,
        ORANGE=0xffffa34d, PURPLE=0xffb877ef, BLUE=0xff698adf, RED=0xffff6d65, DIM=0xff85968e;
    private static final String[] SIDE={
        "           W             ",
        " WWWWWWWWWWWWWWWWWWWWWWW ",
        "           W             ",
        "          GGGGGGG        ",
        " G        GGGGGBBBB      ",
        " GGG      GGGGGBBBBB     ",
        " GGGGGGGGGGGGGGBBBBBG    ",
        " G        GGGGGGGGGGGG   ",
        "          GGGGGGGGGGGG   ",
        "           GGGGGGGGGG    ",
        "             W    W      ",
        "             W    W      ",
        "          WWWWWWWWWWWW   "};
    private static final String[] FRONT={
        " WWWWWWWWWWWWWWWWWWWWW ",
        "           W           ",
        "        GGGGGGG        ",
        "       GBBBBBBBG       ",
        "      GGBBBBBBBGG      ",
        "      GGGGGGGGGGG      ",
        "       GGGGGGGGG       ",
        "        GGGGGGG        ",
        "      W         W      ",
        "     W           W     ",
        "    WWWWWWWWWWWWWWW    "};
    public GameView(Context context){this(context,new Game());}
    public GameView(Context context,Game game){
        super(context);this.game=game;paint.setAntiAlias(false);paint.setTypeface(Typeface.MONOSPACE);
        audio=new AudioEngine(context);
        soundEnabled=context.getSharedPreferences("settings",0).getBoolean("sound",true);
        setFocusableInTouchMode(true);requestFocus();
        setContentDescription("Choplifter. Joystick gauche pour voler. Gauche, face et droite pour orienter. Tir à droite. Son et pause en haut.");
    }
    void pauseMission(){game.paused=true;clearInput();audio.pause();invalidate();}
    void suspend(){pauseMission();drawing=false;previous=0;accumulator=0;Choreographer.getInstance().removeFrameCallback(this);}
    void resumeDrawing(){if(!drawing){drawing=true;previous=0;Choreographer.getInstance().postFrameCallback(this);}}
    void releaseAudio(){audio.release();}
    private void clearInput(){stick=fire=-1;ax=ay=0;keyFire=false;}
    private void toggleSound(){soundEnabled=!soundEnabled;audio.update(game,soundEnabled);
        getContext().getSharedPreferences("settings",0).edit().putBoolean("sound",soundEnabled).apply();invalidate();}
    @Override public void doFrame(long nanos){
        if(!drawing)return;
        if(previous!=0&&!game.paused&&!game.over){
            accumulator+=Math.min(.12,(nanos-previous)/1_000_000_000.0);
            while(accumulator>=1.0/60){game.update(1/60f,ax,ay,fire!=-1||keyFire);accumulator-=1.0/60;}
        }else accumulator=0;
        audio.update(game,soundEnabled);previous=nanos;invalidate();Choreographer.getInstance().postFrameCallback(this);
    }
    @Override protected void onDetachedFromWindow(){suspend();super.onDetachedFromWindow();}
    @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){
        scale=Math.min(w/960f,h/540f);ox=(w-960*scale)/2;oy=(h-540*scale)/2;
    }
    private void rect(Canvas c,float l,float t,float r,float b,int color){paint.setColor(color);paint.setStyle(Paint.Style.FILL);c.drawRect(l,t,r,b,paint);}
    private void text(Canvas c,String text,float x,float y,float size,int color){paint.setColor(color);paint.setTextSize(size);c.drawText(text,x,y,paint);}
    private void line(Canvas c,float x,float y,float x2,float y2,int color,float width){paint.setColor(color);paint.setStrokeWidth(width);c.drawLine(x,y,x2,y2,paint);}
    private void circle(Canvas c,float x,float y,float r,int color){paint.setColor(color);c.drawCircle(x,y,r,paint);}
    private void panel(Canvas c,float l,float t,float r,float b,int border){
        rect(c,l,t,r,b,border);rect(c,l+2,t+2,r-2,b-2,BLACK);
    }
    private void sprite(Canvas c,String[] pixels,float x,float y,int body){
        for(int row=0;row<pixels.length;row++)for(int col=0;col<pixels[row].length();col++){
            char v=pixels[row].charAt(col);if(v==' ')continue;
            int color=v=='W'?WHITE:v=='B'?BLUE:body;
            rect(c,x+col*2,y+row*2,x+col*2+2,y+row*2+2,color);
        }
    }
    @Override protected void onDraw(Canvas c){
        super.onDraw(c);c.drawColor(BLACK);c.save();c.translate(ox,oy);c.scale(scale,scale);c.clipRect(0,0,960,540);
        camera=Math.round(Math.max(0,Math.min(Game.WORLD-960,game.x-380))/2)*2;
        drawWorld(c);drawHud(c);drawControls(c);
        if(game.paused||game.over)drawOverlay(c);
        c.restore();
    }
    private void drawWorld(Canvas c){
        // Discrete, restricted palette; no borrowed sprites or textures.
        for(int i=-1;i<13;i++){
            float px=i*100-(camera*.15f)%100;
            rect(c,px,310+(i%3)*12,px+100,390,0xff202b21);
            rect(c,px+18,294+(i%3)*12,px+82,390,0xff202b21);
        }
        rect(c,0,390,960,412,0xff49392d);rect(c,0,390,960,394,GREEN);
        for(int i=0;i<80;i++){float px=i*16-camera%16;rect(c,px,401,px+6,403,ORANGE);}
        c.save();c.translate(-camera,0);
        // Post office and its adjacent landing pad.
        rect(c,0,332,88,390,PURPLE);rect(c,0,326,92,334,WHITE);
        rect(c,56,356,76,390,BLACK);rect(c,12,344,34,362,BLUE);
        text(c,"POST",4,384,14,WHITE);
        rect(c,102,396,264,400,WHITE);text(c,"H",172,386,25,WHITE);
        for(int i=0;i<5;i++){rect(c,Game.BARRIER+i*4,350-i*2,Game.BARRIER+i*4+2,390,GREEN);}
        line(c,Game.BARRIER,349,Game.BARRIER+16,341,GREEN,2);
        for(int i=0;i<4;i++){
            Game.Building b=game.buildings.get(i);boolean active=i==game.activeBuilding();
            int color=b.open?ORANGE:PURPLE;
            rect(c,b.x-56,330,b.x+56,390,color);rect(c,b.x-60,324,b.x+60,332,WHITE);
            for(int brick=0;brick<5;brick++)line(c,b.x-54,342+brick*9,b.x+54,342+brick*9,BLACK,2);
            rect(c,b.x-15,352,b.x+15,390,b.open?BLACK:BLUE);
            if(b.open){rect(c,b.x-27,326,b.x-7,342,BLACK);rect(c,b.x+14,326,b.x+37,337,BLACK);}
            text(c,"0"+(i+1),b.x-12,314,16,active?GREEN:DIM);
            if(active&&game.mode==Game.Mode.ASSISTED){
                rect(c,b.x+78,392,b.x+172,396,GREEN);text(c,"POSEZ ICI",b.x+78,414,12,GREEN);
            }
            if(b.open&&game.waiting(i)>0)text(c,""+game.waiting(i),b.x+32,365,14,WHITE);
        }
        int savedShown=0;
        for(Game.Person p:game.people){
            if(p.state==Game.State.FREE)drawPerson(c,p.x,390,WHITE,game.count(Game.State.ONBOARD)>=16);
            else if(p.state==Game.State.SAVED&&savedShown++<12)drawPerson(c,p.x,390,GREEN,true);
        }
        for(Game.Tank t:game.tanks){
            if(t.hp<=0){rect(c,t.x-20,384,t.x+20,390,0xff49392d);continue;}
            rect(c,t.x-26,379,t.x+26,390,WHITE);rect(c,t.x-22,373,t.x+22,384,ORANGE);
            rect(c,t.x-10,366,t.x+10,376,ORANGE);
            rect(c,t.x-18,384,t.x-12,388,BLACK);rect(c,t.x-4,384,t.x+2,388,BLACK);rect(c,t.x+10,384,t.x+16,388,BLACK);
            line(c,t.x,369,t.x+(game.x<t.x?-34:34),365,WHITE,4);
        }
        for(Game.Jet j:game.jets)if(j.hp>0){
            c.save();c.translate(j.x,j.y);c.scale(j.vx<0?-1:1,1);
            rect(c,-26,-2,28,4,WHITE);rect(c,14,-5,24,6,WHITE);
            rect(c,-10,-12,2,12,PURPLE);rect(c,-28,-9,-22,3,PURPLE);rect(c,-34,0,-28,4,ORANGE);c.restore();
        }
        for(Game.Mine m:game.mines)if(m.hp>0){
            int flash=((int)(game.time*7)%2==0)?PURPLE:ORANGE;
            rect(c,m.x-12,m.y-7,m.x+12,m.y+7,flash);rect(c,m.x-6,m.y-12,m.x+6,m.y+12,flash);
            rect(c,m.x-3,m.y-3,m.x+3,m.y+3,WHITE);
            line(c,m.x-18,m.y,m.x+18,m.y,WHITE,2);
        }
        for(Game.Shot s:game.shots)rect(c,s.x-3,s.y-2,s.x+3,s.y+(s.bomb?5:2),s.enemy?RED:WHITE);
        drawHelicopter(c);c.restore();
    }
    private void drawPerson(Canvas c,float x,float y,int color,boolean wave){
        x=Math.round(x/2)*2;float gait=(int)(game.time*7+x)%2==0?2:-2;
        rect(c,x-2,y-17,x+2,y-13,color);rect(c,x-2,y-12,x+2,y-5,color);
        line(c,x,y-6,x-3-gait,y,color,2);line(c,x,y-6,x+3+gait,y,color,2);
        line(c,x-1,y-11,x-6,y-(wave?17:8),color,2);line(c,x+1,y-11,x+6,y-(wave?17:8),color,2);
    }
    private void drawHelicopter(Canvas c){
        c.save();c.translate(Math.round(game.x/2)*2,Math.round(game.y/2)*2);
        if(game.crashTimer>0){
            int phase=(int)(game.crashTimer*8);
            for(int i=0;i<12;i++){
                double angle=i*Math.PI/6;float radius=(2.2f-game.crashTimer)*38;
                float px=(float)Math.cos(angle)*radius,py=(float)Math.sin(angle)*radius;
                rect(c,px-4,py-4,px+4,py+4,(i+phase)%2==0?ORANGE:WHITE);
            }
            c.restore();return;
        }
        if(game.invulnerable>0&&(int)(game.time*10)%2==0){c.restore();return;}
        int color=game.mode==Game.Mode.ASSISTED&&game.hp<35?RED:GREEN;
        if(game.facing==0)sprite(c,FRONT,-23,-22,color);
        else{c.scale(game.facing,1);c.rotate(game.landed()?0:game.tilt());sprite(c,SIDE,-26,-24,color);}
        if(!game.paused&&!game.landed()&&(int)(game.time*24)%2==0){rect(c,-25,-22,25,-20,BLACK);rect(c,-12,-22,12,-20,WHITE);}
        c.restore();
    }
    private void drawHud(Canvas c){
        panel(c,14,10,946,70,GREEN);
        text(c,"CHOPLIFTER!",26,36,19,GREEN);text(c,"ANDROID 0.4",26,57,12,DIM);
        text(c,"MORTS",222,31,12,RED);text(c,""+game.count(Game.State.DEAD),240,57,23,RED);
        text(c,"À BORD",352,31,12,WHITE);text(c,game.count(Game.State.ONBOARD)+"/16",350,57,23,WHITE);
        text(c,"SAUVÉS",510,31,12,GREEN);text(c,game.count(Game.State.SAVED)+"/64",507,57,23,GREEN);
        text(c,game.mode==Game.Mode.CLASSIC?"APPAREILS":"COQUE",660,31,12,ORANGE);
        text(c,game.mode==Game.Mode.CLASSIC?""+game.lives:game.hp+"%",678,57,23,ORANGE);
        button(c,780,22,850,58,soundEnabled?"SON ON":"SON OFF",DIM,11);
        button(c,860,22,935,58,"PAUSE",GREEN,12);
        rect(c,270,83,690,85,DIM);
        for(int i=0;i<4;i++){Game.Building b=game.buildings.get(i);rect(c,270+b.x/Game.WORLD*420,80,276+b.x/Game.WORLD*420,88,b.open?GREEN:PURPLE);}
        rect(c,270+game.x/Game.WORLD*420,78,274+game.x/Game.WORLD*420,88,WHITE);
        text(c,"BASE ← "+(int)Math.abs(game.x-Game.BASE),22,91,12,DIM);
        if(game.warningTime>0)text(c,"! "+game.warning,280,113,15,ORANGE);
        else if(game.messageTime>0)text(c,game.message,250,113,13,WHITE);
    }
    private void button(Canvas c,float l,float t,float r,float b,String title,int border,int size){
        panel(c,l,t,r,b,border);paint.setTextSize(size);float width=paint.measureText(title);
        text(c,title,(l+r-width)/2,(t+b+size)/2-2,size,border);
    }
    private void drawControls(Canvas c){
        rect(c,0,416,960,540,BLACK);line(c,14,416,946,416,0xff283d33,2);
        circle(c,105,476,49,0xff182c22);circle(c,105,476,38,0xff254630);
        line(c,63,476,147,476,DIM,1);line(c,105,434,105,518,DIM,1);
        circle(c,105+ax*30,476+ay*30,18,GREEN);text(c,"VOL",93,536,11,DIM);
        for(int i=0;i<3;i++){
            float bx=300+i*105;int direction=i-1;boolean selected=game.facing==direction;
            button(c,bx-40,447,bx+40,501,i==0?"←":i==1?"FACE":"→",selected?GREEN:DIM,i==1?16:24);
        }
        text(c,"ORIENTATION / Q · F · E",300,529,11,DIM);
        button(c,785,438,920,507,"TIR",fire!=-1||keyFire?WHITE:ORANGE,24);
        text(c,game.facing==0?"VERS LE SOL":"HORIZONTAL",798,529,12,ORANGE);
        if(game.mode==Game.Mode.ASSISTED)text(c,game.landed()?"POSÉ ET STABLE":"RELÂCHEZ POUR FREINER",570,478,11,DIM);
    }
    private void drawOverlay(Canvas c){
        rect(c,0,0,960,540,0xe8070b10);panel(c,175,121,785,454,GREEN);
        text(c,game.over?game.message:(game.started?"MISSION EN PAUSE":"CHOPLIFTER / 0.4"),210,164,24,GREEN);
        if(game.over){
            text(c,game.count(Game.State.SAVED)+" PERSONNES SAUVÉES SUR 64",225,224,20,GREEN);
            text(c,game.count(Game.State.DEAD)+" pertes · "+(int)game.time+" secondes",225,259,16,WHITE);
            text(c,game.mode==Game.Mode.CLASSIC?"MODE CLASSIQUE":"MODE ASSISTÉ",225,300,15,ORANGE);
        }else if(!game.started){
            text(c,"CHOISISSEZ VOTRE MODE",225,202,15,WHITE);
            button(c,255,218,470,260,"CLASSIQUE",game.mode==Game.Mode.CLASSIC?GREEN:DIM,17);
            button(c,490,218,705,260,"ASSISTÉ",game.mode==Game.Mode.ASSISTED?GREEN:DIM,17);
            text(c,"3 appareils · 64 personnes · 16 places",225,287,16,WHITE);
            text(c,"VOL : joystick | ORIENTATION : gauche, face, droite",210,314,14,WHITE);
            text(c,"FACE + TIR vise le sol. Posez-vous à côté des otages.",210,338,14,WHITE);
        }else{
            text(c,"Joystick : voler. Gauche / face / droite : orienter.",210,217,15,WHITE);
            text(c,"FACE + TIR attaque les chars et ouvre les casernes.",210,250,15,WHITE);
            text(c,"Sauvez un groupe avant de libérer le suivant.",210,283,15,WHITE);
            text(c,"Retournez sur la piste à côté de la poste.",210,316,15,WHITE);
        }
        button(c,285,353,675,404,game.over?"REJOUER":game.started?"REPRENDRE":"DÉCOLLER",GREEN,21);
        if(game.started)button(c,305,415,655,443,"CHOISIR LE MODE",DIM,13);
    }
    @Override public boolean onTouchEvent(MotionEvent e){
        int action=e.getActionMasked(),id=e.getPointerId(e.getActionIndex());
        float tx=(e.getX(e.getActionIndex())-ox)/scale,ty=(e.getY(e.getActionIndex())-oy)/scale;
        boolean down=action==MotionEvent.ACTION_DOWN||action==MotionEvent.ACTION_POINTER_DOWN;
        if(action==MotionEvent.ACTION_CANCEL){clearInput();return true;}
        if(down&&tx>=780&&tx<=850&&ty>=22&&ty<=58){toggleSound();return true;}
        if(game.paused||game.over){
            if(!game.started&&action==MotionEvent.ACTION_DOWN&&ty>=218&&ty<=260){
                if(tx>=255&&tx<=470)game=new Game(Game.Mode.CLASSIC);
                if(tx>=490&&tx<=705)game=new Game(Game.Mode.ASSISTED);
                invalidate();return true;
            }
            if(game.started&&action==MotionEvent.ACTION_DOWN&&tx>=305&&tx<=655&&ty>=415&&ty<=443){
                game=new Game(game.mode);clearInput();invalidate();return true;
            }
            if(action==MotionEvent.ACTION_DOWN&&tx>=285&&tx<=675&&ty>=353&&ty<=404){
                if(game.over)game=new Game(game.mode);game.start();clearInput();resumeDrawing();performClick();
            }
            return true;
        }
        if(down){
            if(tx>=860&&ty<=70){pauseMission();return true;}
            for(int i=0;i<3;i++)if(tx>=260+i*105&&tx<=340+i*105&&ty>=447&&ty<=501)game.orient(i-1);
            if(tx<220&&ty>416&&stick==-1)stick=id;
            if(tx>=775&&tx<=930&&ty>=428&&ty<=517&&fire==-1)fire=id;
        }
        if(action==MotionEvent.ACTION_UP||action==MotionEvent.ACTION_POINTER_UP){
            if(id==stick){stick=-1;ax=ay=0;}if(id==fire)fire=-1;
        }
        int index=e.findPointerIndex(stick);
        if(index>=0){
            float dx=((e.getX(index)-ox)/scale-105)/42,dy=((e.getY(index)-oy)/scale-476)/42;
            float len=Math.max(1,(float)Math.hypot(dx,dy));ax=dx/len;ay=dy/len;
            if(Math.hypot(ax,ay)<.12f)ax=ay=0;
        }
        return true;
    }
    @Override public boolean performClick(){super.performClick();return true;}
    @Override public boolean onKeyDown(int code,KeyEvent e){
        if(code==KeyEvent.KEYCODE_ENTER){if(game.over)game=new Game(game.mode);game.start();resumeDrawing();return true;}
        if(code==KeyEvent.KEYCODE_P||code==KeyEvent.KEYCODE_ESCAPE){if(game.started&&!game.over){game.paused=!game.paused;clearInput();}return true;}
        if(code==KeyEvent.KEYCODE_M){toggleSound();return true;}
        if(code==KeyEvent.KEYCODE_DPAD_LEFT||code==KeyEvent.KEYCODE_A){ax=-1;return true;}
        if(code==KeyEvent.KEYCODE_DPAD_RIGHT||code==KeyEvent.KEYCODE_D){ax=1;return true;}
        if(code==KeyEvent.KEYCODE_DPAD_UP||code==KeyEvent.KEYCODE_W){ay=-1;return true;}
        if(code==KeyEvent.KEYCODE_DPAD_DOWN||code==KeyEvent.KEYCODE_S){ay=1;return true;}
        if(code==KeyEvent.KEYCODE_Q){game.orient(-1);return true;}
        if(code==KeyEvent.KEYCODE_F){game.orient(0);return true;}
        if(code==KeyEvent.KEYCODE_E){game.orient(1);return true;}
        if(code==KeyEvent.KEYCODE_SPACE){keyFire=true;return true;}
        return super.onKeyDown(code,e);
    }
    @Override public boolean onKeyUp(int code,KeyEvent e){
        switch(code){
            case KeyEvent.KEYCODE_DPAD_LEFT:case KeyEvent.KEYCODE_DPAD_RIGHT:case KeyEvent.KEYCODE_A:case KeyEvent.KEYCODE_D:ax=0;return true;
            case KeyEvent.KEYCODE_DPAD_UP:case KeyEvent.KEYCODE_DPAD_DOWN:case KeyEvent.KEYCODE_W:case KeyEvent.KEYCODE_S:ay=0;return true;
            case KeyEvent.KEYCODE_SPACE:keyFire=false;return true;
            default:return super.onKeyUp(code,e);
        }
    }
}

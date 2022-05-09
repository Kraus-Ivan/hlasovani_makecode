radio.setGroup(58)
radio.setTransmitSerialNumber(true)
let stav = 0
//  stav 0 je klient, stav 1 je server
let volba = 0
//  volba klienta (0 = A, 1 = B...)
let hlasovani = false
//  udava, jestli je zapnuto hlasovani od serveru
let list_s_hlasy : any[] = []
//  list s hlasy, ktere prijmul server od klientu
let rozsah = 26
//  zvoleny rozsah moznosti hlasu (A, B, C...)
basic.showIcon(IconNames.Asleep)
function reset_promennych() {
    
    volba = 0
    hlasovani = false
    for (let y = 0; y < list_s_hlasy.length; y++) {
        _py.py_array_pop(list_s_hlasy)
    }
    if (stav == 0) {
        basic.showIcon(IconNames.Asleep)
    }
    
}

radio.onReceivedValue(function on_received_value(name: string, value: number) {
    let counter: number;
    let nalez: boolean;
    
    let ser_cislo = radio.receivedPacket(RadioPacketProperty.SerialNumber)
    let vlastni_ser_cislo = control.deviceSerialNumber()
    if (stav == 1 && name == "answer" && hlasovani) {
        //  server pri zapnutem hlasovani...
        counter = 0
        nalez = false
        for (let hlas of list_s_hlasy) {
            //  projde list s hlasy a pokud najde jiz objevene seriove cislo, tak nahradi odpoved daneho serioveho cisla
            if (hlas["ser_cislo"] == ser_cislo) {
                list_s_hlasy[counter]["choose"] = value
                nalez = true
            }
            
            counter += 1
        }
        if (nalez == false) {
            //  pokud nenalezne stejne seriove cislo, ulozi hlas jako novy
            list_s_hlasy.push( {
                "ser_cislo" : ser_cislo,
                "choose" : value,
            }
            )
        }
        
        //  pushnuti hlasu do listu s hlasy
        radio.sendValue("ano", ser_cislo)
        // posle potvrzeni o prijmuti (name = "ano")
        basic.showIcon(IconNames.Heart)
        basic.clearScreen()
    } else if (stav == 0 && name == "ano") {
        //  klient prijme potvrzene prijmuti "ano"
        if (value == vlastni_ser_cislo) {
            //  kdyz se prijate seriove cislo shoduje s vlastnim, tak ukaze ikonku YES
            basic.showIcon(IconNames.Yes)
            if (hlasovani) {
                basic.showString(String.fromCharCode(volba + 65), rozsah - 1)
            }
            
        }
        
    } else if (stav == 0 && name == "stav") {
        //  klient prijme informaci o zmene stavu, value == 1 zapne hlasovani, value == 0 vypne hlasovani
        if (value == 1) {
            hlasovani = true
            volba = 0
            basic.showString(String.fromCharCode(volba + 65), rozsah - 1)
        } else {
            hlasovani = false
            basic.showIcon(IconNames.Asleep)
        }
        
    }
    
})
radio.onReceivedString(function on_received_string(receivedString: string) {
    
    if (stav == 0 && receivedString == "reset") {
        //  klient pri prijmuti "reset" resetuje hlasovani
        reset_promennych()
    }
    
})
function vyhodnoceni_hlasu() {
    let pocet: number;
    
    for (let moznost_hlasu = 0; moznost_hlasu < rozsah; moznost_hlasu++) {
        //  projde moznosti od 0 do zvoleneho rozsahu
        pocet = 0
        for (let n of list_s_hlasy) {
            //  projde hlasy od klientu v listu list_s_hlasy
            if (n["choose"] == moznost_hlasu) {
                //  pokud najde shodu moznosti s hlasem, pricte k promenne pocet 1
                pocet += 1
            }
            
        }
        if (pocet > 0) {
            //  pokud naleznul aspon 1 shodu, ukaze danou moznost a jeji pocet vyskytu
            basic.showString(String.fromCharCode(moznost_hlasu + 65))
            basic.showNumber(pocet)
            basic.clearScreen()
        }
        
    }
}

input.onLogoEvent(TouchButtonEvent.Pressed, function on_logo_event_pressed() {
    //  DOTYKOVE TLACITKO
    
    if (stav == 0) {
        //  klient odesle svoji volbu
        radio.sendValue("answer", volba)
    }
    
    if (stav == 1) {
        //  server vynuluje hlasovani
        radio.sendString("reset")
        reset_promennych()
    }
    
})
basic.forever(function on_forever() {
    
    if (input.buttonIsPressed(Button.A)) {
        // TLACITKO A
        if (stav == 0 && hlasovani) {
            //  klient zvysi volbu o 1
            volba += 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            basic.showString(String.fromCharCode(volba + 65), 40)
        } else if (stav == 1) {
            if (hlasovani) {
                radio.sendValue("stav", 0)
                //  pokud je hlasovani zapnute, posle server informaci o vypnuti hlasovani
                hlasovani = false
                //  server u sebe vypne hlasovani
                basic.showIcon(IconNames.No)
            } else {
                radio.sendValue("stav", 1)
                //  pokud je hlasovani vypnute, posle server informaci o zapnuti hlasovani
                hlasovani = true
                //  server u sebe zapne hlasovani
                basic.showIcon(IconNames.Yes)
            }
            
            basic.clearScreen()
        }
        
    }
    
    if (input.buttonIsPressed(Button.B)) {
        // TLACITKO B
        if (stav == 0) {
            //  klient snizi svoji volbu o 1
            volba -= 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            basic.showString(String.fromCharCode(volba + 65), 40)
        } else if (stav == 1) {
            //  server vyhodnoti hlasovani
            vyhodnoceni_hlasu()
        }
        
    }
    
    if (input.pinIsPressed(TouchPin.P0)) {
        //  zmena ze stavu klienta na server a naopak
        if (stav == 0) {
            stav = 1
        } else {
            stav = 0
        }
        
        basic.showNumber(stav)
        basic.clearScreen()
        if (stav == 0 && hlasovani == false) {
            basic.showIcon(IconNames.Asleep)
        } else if (stav == 0 && hlasovani) {
            basic.showString(String.fromCharCode(volba + 65), rozsah - 1)
        }
        
    }
    
})

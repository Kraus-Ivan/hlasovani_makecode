radio.setGroup(58)
radio.setTransmitSerialNumber(true)
let vlastni_ser_cislo = control.deviceSerialNumber()
let stav = 0
//  stav 0 je klient, stav 1 je server
let volba = 0
//  volba klienta
let hlasovani = false
//  stav, jestli je zapnuto hlasovani od serveru
let list_s_hlasy : any[] = []
basic.showIcon(IconNames.Asleep)
let rozsah = 26
// zvoleny rozsah moznosti hlasu
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
    if (stav == 1 && name == "answer" && hlasovani) {
        //  kdyz je stav nastaven na server a hlasovani je zapnuto
        counter = 0
        nalez = false
        for (let iterace of list_s_hlasy) {
            //  proje list s hlasy a pokud najde jiz objevene seriove cislo, tak nahradi odpoved
            if (iterace["ser_cislo"] == ser_cislo) {
                list_s_hlasy[counter]["choose"] = value
                nalez = true
            }
            
            counter += 1
        }
        if (nalez == false) {
            //  pokud nenalezne seriove cislo, ulozi hlas jako novy
            list_s_hlasy.push( {
                "ser_cislo" : ser_cislo,
                "choose" : value,
            }
            )
        }
        
        // pushnuti hlasu do listu s hlasy
        radio.sendValue("ano", ser_cislo)
        // posle potvrzeni o prijmuti (name = "ano")
        basic.showIcon(IconNames.Heart)
        basic.clearScreen()
    } else if (stav == 0 && name == "ano") {
        // kdyz je stav nastaven na klienta a potvrzene prijmuti
        if (value == vlastni_ser_cislo) {
            // kdyz se shoduje prijmute ser. cislo s vlastnim ser. cislem
            basic.showIcon(IconNames.Yes)
            if (hlasovani) {
                basic.showString(String.fromCharCode(volba + 65), rozsah - 1)
            }
            
        }
        
    }
    
})
radio.onReceivedString(function on_received_string(receivedString: string) {
    
    if (stav == 0 && receivedString == "stav") {
        //  klient pri prijmuti "stav", zmeni stav hlasovani
        if (hlasovani) {
            hlasovani = false
            basic.showIcon(IconNames.Asleep)
        } else {
            hlasovani = true
            basic.showString(String.fromCharCode(volba + 65), rozsah - 1)
        }
        
    } else if (stav == 0 && receivedString == "reset") {
        //  klient pri prijmuti "reset", vynuluje hlasovani
        reset_promennych()
    }
    
})
function vyhodnoceni_hlasu() {
    let pocet: number;
    
    for (let moznost_hlasu = 0; moznost_hlasu < rozsah; moznost_hlasu++) {
        pocet = 0
        for (let n of list_s_hlasy) {
            if (n["choose"] == moznost_hlasu) {
                pocet += 1
            }
            
        }
        if (pocet > 0) {
            basic.showString(String.fromCharCode(moznost_hlasu + 65))
            basic.showNumber(pocet)
            basic.clearScreen()
        }
        
    }
}

input.onLogoEvent(TouchButtonEvent.Pressed, function on_logo_event_pressed() {
    
    if (stav == 0) {
        //  klient odesle volbu
        radio.sendValue("answer", volba)
    }
    
    if (stav == 1) {
        //  server vynuluje hlasovani
        radio.sendString("reset")
        reset_promennych()
    }
    
})
basic.forever(function on_forever() {
    
    //  na zacatku: volba = 0
    if (input.buttonIsPressed(Button.A)) {
        if (stav == 0 && hlasovani) {
            //  klient zvysi volbu o 1
            volba += 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            if (hlasovani) {
                //  kvuli mozne rychle zmene hlasovani od server jeste jednou testuje klient stav hlasovani
                basic.showString(String.fromCharCode(volba + 65), 40)
            }
            
        } else if (stav == 1) {
            radio.sendString("stav")
            //  odesila informaci o zmene stavu hlasovani
            if (hlasovani) {
                //  server vypne hlasovani, pokud je zaple
                hlasovani = false
                basic.showIcon(IconNames.No)
            } else {
                hlasovani = true
                //  jinak zapne server hlasovani
                basic.showIcon(IconNames.Yes)
            }
            
            basic.clearScreen()
        }
        
    }
    
    if (input.buttonIsPressed(Button.B)) {
        if (stav == 0) {
            //  klient snizi volbu o 1
            volba -= 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            if (hlasovani) {
                //  kvuli mozne rychle zmene hlasovani od server jeste jednou testuje klient stav hlasovani
                basic.showString(String.fromCharCode(volba + 65), 40)
            }
            
        } else if (stav == 1) {
            //  server vyhodnoti hlasovani
            vyhodnoceni_hlasu()
        }
        
    }
    
    if (input.pinIsPressed(TouchPin.P0)) {
        //  zmena z klienta na server a naopak
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

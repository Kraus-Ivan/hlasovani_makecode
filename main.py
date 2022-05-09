radio.set_group(58)
radio.set_transmit_serial_number(True)
vlastni_ser_cislo = control.device_serial_number()
stav = 0 # stav 0 je klient, stav 1 je server
volba = 0 # volba klienta
hlasovani = False # stav, jestli je zapnuto hlasovani od serveru

list_s_hlasy: List[any] = []
basic.show_icon(IconNames.ASLEEP)

rozsah = 26 #zvoleny rozsah moznosti hlasu

def reset_promennych():
    global stav, volba, hlasovani, list_s_hlasy
    volba = 0
    hlasovani = False
    for y in range(len(list_s_hlasy)):
        list_s_hlasy.pop()
    if stav == 0:
        basic.show_icon(IconNames.ASLEEP)

def on_received_value(name, value):
    global stav, list_s_hlasy, hlasovani, vlastni_ser_cislo, rozsah
    ser_cislo = radio.received_packet(RadioPacketProperty.SERIAL_NUMBER)

    if stav == 1 and name == "answer" and hlasovani: # kdyz je stav nastaven na server a hlasovani je zapnuto
        counter = 0
        nalez = False
        for iterace in list_s_hlasy: # proje list s hlasy a pokud najde jiz objevene seriove cislo, tak nahradi odpoved
            if iterace["ser_cislo"] == ser_cislo:
                list_s_hlasy[counter]["choose"] = value
                nalez = True
            counter += 1
        if nalez == False: # pokud nenalezne seriove cislo, ulozi hlas jako novy
            list_s_hlasy.push({"ser_cislo" : ser_cislo, "choose" : value}) #pushnuti hlasu do listu s hlasy
        radio.send_value("ano", ser_cislo) #posle potvrzeni o prijmuti (name = "ano")
        basic.show_icon(IconNames.HEART)
        basic.clear_screen()
    elif stav == 0 and name == "ano": #kdyz je stav nastaven na klienta a potvrzene prijmuti
        if value == vlastni_ser_cislo: #kdyz se shoduje prijmute ser. cislo s vlastnim ser. cislem
            basic.show_icon(IconNames.YES)
            if hlasovani:
                basic.show_string(String.from_char_code(volba+65), rozsah - 1)
radio.on_received_value(on_received_value)


def on_received_string(receivedString):
    global stav, hlasovani
    if stav == 0 and receivedString == "stav": # klient pri prijmuti "stav", zmeni stav hlasovani
        if hlasovani:
            hlasovani = False
            basic.show_icon(IconNames.ASLEEP)
        else:
            hlasovani = True
            basic.show_string(String.from_char_code(volba+65), rozsah - 1)

    elif stav == 0 and receivedString == "reset": # klient pri prijmuti "reset", vynuluje hlasovani
        reset_promennych()
radio.on_received_string(on_received_string)


def vyhodnoceni_hlasu():
    global list_s_hlasy, rozsah
    for moznost_hlasu in range(0, rozsah):
        pocet = 0
        for n in list_s_hlasy:
            if n["choose"] == moznost_hlasu:
                pocet += 1
        if pocet > 0:
            basic.show_string(String.from_char_code(moznost_hlasu + 65))
            basic.show_number(pocet)
            basic.clear_screen()

def on_logo_event_pressed():
    global stav, volba
    if stav == 0: # klient odesle volbu
        radio.send_value("answer", volba)
    if stav == 1: # server vynuluje hlasovani
        radio.send_string("reset")
        reset_promennych()
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_event_pressed)

def on_forever(): #đdfljasdf
    global volba, hlasovani, stav, rozsah
    # na zacatku: volba = 0
    if input.button_is_pressed(Button.A):
        if stav == 0 and hlasovani: # klient zvysi volbu o 1
            volba += 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            if hlasovani: # kvuli mozne rychle zmene hlasovani od server jeste jednou testuje klient stav hlasovani
                basic.show_string(String.from_char_code(volba+65), 40)
        elif stav == 1:
            radio.send_string("stav") # odesila informaci o zmene stavu hlasovani
            if hlasovani: # server vypne hlasovani, pokud je zaple
                hlasovani = False
                basic.show_icon(IconNames.NO)
            else:
                hlasovani = True # jinak zapne server hlasovani
                basic.show_icon(IconNames.YES)
            basic.clear_screen()
            
    if input.button_is_pressed(Button.B):
        if stav == 0: # klient snizi volbu o 1
            volba -= 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            if hlasovani: # kvuli mozne rychle zmene hlasovani od server jeste jednou testuje klient stav hlasovani
                basic.show_string(String.from_char_code(volba+65), 40)

        elif stav == 1: # server vyhodnoti hlasovani
            vyhodnoceni_hlasu()

    if input.pin_is_pressed(TouchPin.P0): # zmena z klienta na server a naopak
        if stav == 0:
            stav = 1
        else:
            stav = 0
        basic.show_number(stav)
        basic.clear_screen()
        if stav ==  0 and hlasovani == False:
            basic.show_icon(IconNames.ASLEEP)
        elif stav == 0 and hlasovani:
            basic.show_string(String.from_char_code(volba+65), rozsah - 1)
basic.forever(on_forever)
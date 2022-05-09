radio.set_group(58)
radio.set_transmit_serial_number(True)
stav = 0 # stav 0 je klient, stav 1 je server
volba = 0 # volba klienta (0 = A, 1 = B...)
hlasovani = False # udava, jestli je zapnuto hlasovani od serveru

list_s_hlasy: List[any] = [] # list s hlasy, ktere prijmul server od klientu
rozsah = 26 # zvoleny rozsah moznosti hlasu (A, B, C...)

basic.show_icon(IconNames.ASLEEP)

def reset_promennych():
    global stav, volba, hlasovani, list_s_hlasy
    volba = 0
    hlasovani = False
    for y in range(len(list_s_hlasy)):
        list_s_hlasy.pop()
    if stav == 0:
        basic.show_icon(IconNames.ASLEEP)

def on_received_value(name, value):
    global stav, list_s_hlasy, hlasovani, rozsah, volba
    ser_cislo = radio.received_packet(RadioPacketProperty.SERIAL_NUMBER) 
    vlastni_ser_cislo = control.device_serial_number()

    if stav == 1 and name == "answer" and hlasovani: # server pri zapnutem hlasovani...
        counter = 0
        nalez = False
        for hlas in list_s_hlasy: # projde list s hlasy a pokud najde jiz objevene seriove cislo, tak nahradi odpoved daneho serioveho cisla
            if hlas["ser_cislo"] == ser_cislo:
                list_s_hlasy[counter]["choose"] = value
                nalez = True
            counter += 1
        if nalez == False: # pokud nenalezne stejne seriove cislo, ulozi hlas jako novy
            list_s_hlasy.push({"ser_cislo" : ser_cislo, "choose" : value}) # pushnuti hlasu do listu s hlasy
        radio.send_value("ano", ser_cislo) #posle potvrzeni o prijmuti (name = "ano")
        basic.show_icon(IconNames.HEART)
        basic.clear_screen()

    elif stav == 0 and name == "ano": # klient prijme potvrzene prijmuti "ano"
        if value == vlastni_ser_cislo: # kdyz se prijate seriove cislo shoduje s vlastnim, tak ukaze ikonku YES
            basic.show_icon(IconNames.YES)
            if hlasovani:
                basic.show_string(String.from_char_code(volba+65), rozsah - 1)

    elif stav == 0 and name == "stav": # klient prijme informaci o zmene stavu, value == 1 zapne hlasovani, value == 0 vypne hlasovani
        if value == 1:
            hlasovani = True
            volba = 0
            basic.show_string(String.from_char_code(volba+65), rozsah - 1)
        else:
            hlasovani = False
            basic.show_icon(IconNames.ASLEEP)
radio.on_received_value(on_received_value)


def on_received_string(receivedString):
    global stav, hlasovani
    if stav == 0 and receivedString == "reset": # klient pri prijmuti "reset" resetuje hlasovani
        reset_promennych()
radio.on_received_string(on_received_string)


def vyhodnoceni_hlasu():
    global list_s_hlasy, rozsah
    for moznost_hlasu in range(0, rozsah): # projde moznosti od 0 do zvoleneho rozsahu
        pocet = 0
        for n in list_s_hlasy: # projde hlasy od klientu v listu list_s_hlasy
            if n["choose"] == moznost_hlasu: # pokud najde shodu moznosti s hlasem, pricte k promenne pocet 1
                pocet += 1
        if pocet > 0: # pokud naleznul aspon 1 shodu, ukaze danou moznost a jeji pocet vyskytu
            basic.show_string(String.from_char_code(moznost_hlasu + 65))
            basic.show_number(pocet)
            basic.clear_screen()

def on_logo_event_pressed(): # DOTYKOVE TLACITKO
    global stav, volba
    if stav == 0: # klient odesle svoji volbu
        radio.send_value("answer", volba)
    if stav == 1: # server vynuluje hlasovani
        radio.send_string("reset")
        reset_promennych()
input.on_logo_event(TouchButtonEvent.PRESSED, on_logo_event_pressed)


def on_forever():
    global volba, hlasovani, stav, rozsah

    if input.button_is_pressed(Button.A): #TLACITKO A
        if stav == 0 and hlasovani: # klient zvysi volbu o 1
            volba += 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            basic.show_string(String.from_char_code(volba+65), 40)

        elif stav == 1:
            if hlasovani:
                radio.send_value("stav", 0) # pokud je hlasovani zapnute, posle server informaci o vypnuti hlasovani
                hlasovani = False # server u sebe vypne hlasovani
                basic.show_icon(IconNames.NO)
            else:
                radio.send_value("stav", 1)  # pokud je hlasovani vypnute, posle server informaci o zapnuti hlasovani
                hlasovani = True # server u sebe zapne hlasovani
                basic.show_icon(IconNames.YES)
            basic.clear_screen()
            
    if input.button_is_pressed(Button.B): #TLACITKO B
        if stav == 0: # klient snizi svoji volbu o 1
            volba -= 1
            volba = Math.constrain(volba, 0, rozsah - 1)
            basic.show_string(String.from_char_code(volba+65), 40)

        elif stav == 1: # server vyhodnoti hlasovani
            vyhodnoceni_hlasu()

    if input.pin_is_pressed(TouchPin.P0): # zmena ze stavu klienta na server a naopak
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
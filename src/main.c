#include <pebble.h>

// Background Dimensions
#define SCREEN_SIZE_W 144
#define SCREEN_SIZE_H 168

#define ROUTE_LAYER_BG_X 0
#define ROUTE_LAYER_BG_Y 0
#define ROUTE_LAYER_BG_HEIGHT 56

#define STOP_LAYER_BG_X 0
#define STOP_LAYER_BG_Y ROUTE_LAYER_BG_Y + ROUTE_LAYER_BG_HEIGHT
#define STOP_LAYER_BG_HEIGHT 56

#define DEPARTURE_LAYER_BG_X 0
#define DEPARTURE_LAYER_BG_Y STOP_LAYER_BG_Y + STOP_LAYER_BG_HEIGHT
#define DEPARTURE_LAYER_BG_HEIGHT SCREEN_SIZE_H - DEPARTURE_LAYER_BG_Y

// Text layer Dimensions
#define ROUTE_SHORT_LAYER_X 0
#define ROUTE_SHORT_LAYER_Y 0
#define ROUTE_SHORT_LAYER_HEIGHT 30
#define ROUTE_LONG_LAYER_X 0
#define ROUTE_LONG_LAYER_Y ROUTE_SHORT_LAYER_Y + ROUTE_SHORT_LAYER_HEIGHT
#define ROUTE_LONG_LAYER_HEIGHT 26

#define STOP_LAYER_X 0
#define STOP_LAYER_Y ROUTE_LONG_LAYER_Y + ROUTE_LONG_LAYER_HEIGHT
#define STOP_LAYER_HEIGHT 56

#define DEPARTURE_1_LAYER_X 0
#define DEPARTURE_1_LAYER_Y STOP_LAYER_Y + STOP_LAYER_HEIGHT - 0
#define DEPARTURE_1_LAYER_HEIGHT 30
#define DEPARTURE_2_3_LAYER_X 0
#define DEPARTURE_2_3_LAYER_Y DEPARTURE_1_LAYER_Y + DEPARTURE_1_LAYER_HEIGHT - 0
#define DEPARTURE_2_3_LAYER_HEIGHT 26

#define TEXT_LAYER_PADDING 2

// Dictionary keys
#define KEY_EVENT 0
#define KEY_ALERT 1
#define KEY_ROUTE_SHORT 10
#define KEY_ROUTE_LONG 11
#define KEY_STOP 12
#define KEY_DEPARTURE_1 14
#define KEY_DEPARTURE_2 15
#define KEY_DEPARTURE_3 16

// Event & alert types
#define ON_LAUNCH 0
#define ON_TICK 1
#define ON_UP_SINGLE 10
#define ON_SELECT_SINGLE 20
#define ON_SELECT_DOUBLE 21
#define ON_SELECT_LONG 22
#define ON_DOWN_SINGLE 30
#define ON_TAP 40

#define ERR_LOC 90
#define ERR_TIMEOUT 91
#define NO_CONFIG 92
#define ERR_HEALTH 93

// Local storage keys
#define CONFIG 1

static Window *window;
static Layer *background_layer;

static GColor color_bg_pt_route, color_bg_pt_stop, color_bg_pt_departures;
static GColor color_font_pt_route, color_font_pt_stop, color_font_pt_departures;

// Display
static TextLayer *text_layer_alert;
static TextLayer *text_layer_pt_route_short;
static TextLayer *text_layer_pt_route_long;
static TextLayer *text_layer_pt_stop;
static TextLayer *text_layer_pt_departures_1;
static TextLayer *text_layer_pt_departures_2_3;

// Variables for storing the PT data
static char string_route_short[40];
static char string_route_long[40];
static char string_stop[40];
static char string_departure_1[] = "0000mins", string_departure_2[] = "0000mins", string_departure_3[] = "0000mins";
static char string_departure_2_3[] = "0000mins, 0000mins";
static int epoch_departure_1, epoch_departure_2, epoch_departure_3;

// Other variables, flags etc
static bool first_launch;

/* Function Prototypes */
static void display_pt_times();
static void display_alert(int alert);
static void send_dict(int msg_type);

static void up_single_click_handler(ClickRecognizerRef recognizer, void *context) {
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_UP_SINGLE);
    } else {
        display_alert(NO_CONFIG);
    }
}

static void select_single_click_handler(ClickRecognizerRef recognizer, void *context) {
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_SELECT_SINGLE);
    } else {
        display_alert(NO_CONFIG);
    }
}

static void select_multi_click_handler(ClickRecognizerRef recognizer, void *context) {
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_SELECT_DOUBLE);
    } else {
        display_alert(NO_CONFIG);
    }
}

static void select_long_click_handler(ClickRecognizerRef recognizer, void *context) {
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_SELECT_LONG);
    } else {
        display_alert(NO_CONFIG);
    }
}

static void down_single_click_handler(ClickRecognizerRef recognizer, void *context) {
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_DOWN_SINGLE);
    } else {
        display_alert(NO_CONFIG);
    }
}

static void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_UP, up_single_click_handler);

    window_single_click_subscribe(BUTTON_ID_SELECT, select_single_click_handler);
    window_multi_click_subscribe(BUTTON_ID_SELECT, 2, 0, 0, false, select_multi_click_handler);
    window_long_click_subscribe(BUTTON_ID_SELECT, 0, select_long_click_handler, 0);

    window_single_click_subscribe(BUTTON_ID_DOWN, down_single_click_handler);
}

static void tap_handler(AccelAxisType axis, int32_t direction) {
    // Request new PT times
    if(persist_read_bool(CONFIG)) {
        send_dict(ON_TAP);
    } else {
        display_alert(NO_CONFIG);
    }
}

// Process the dictionary sent from the phone
static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
    // Assume no errors unless messages received otherwise
    bool alert = false;

    // Read first item
    Tuple *t = dict_read_first(iterator);

    // Receiving a message implies config has been selected so updated local storage
    persist_write_bool(CONFIG, true);

    // For all items
    while(t != NULL) {
        // Which key was received?
        switch(t->key) {
            // Received from the PTV API
            case KEY_ROUTE_SHORT:
                strcpy(string_route_short, t->value->cstring);
                break;
            case KEY_ROUTE_LONG:
                strcpy(string_route_long, t->value->cstring);
                break;
            case KEY_STOP:
                strcpy(string_stop, t->value->cstring);
                break;
            case KEY_DEPARTURE_1:
                epoch_departure_1 = t->value->int32;
                break;
            case KEY_DEPARTURE_2:
                epoch_departure_2 = t->value->int32;
                break;
            case KEY_DEPARTURE_3:
                epoch_departure_3 = t->value->int32;
                break;
            // Error/alert handling
            case KEY_ALERT:
                alert = true;
                switch(t->value->uint8) {
                    case ERR_LOC:
                        display_alert(ERR_LOC);
                        break;
                    case ERR_TIMEOUT:
                        display_alert(ERR_TIMEOUT);
                        break;
                    case ERR_HEALTH:
                        display_alert(ERR_HEALTH);
                        break;
                }
                break;
            default:
                APP_LOG(APP_LOG_LEVEL_ERROR, "Key %d not recognized!", (int)t->key);
                break;
        }

        // Look for next item
        t = dict_read_next(iterator);
    }

    if(!alert) {
        display_pt_times();
    }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
}

static void display_alert(int alert) {
    text_layer_set_text(text_layer_pt_route_short, "");
    text_layer_set_text(text_layer_pt_route_long, "");
    text_layer_set_text(text_layer_pt_stop, "");
    text_layer_set_text(text_layer_pt_departures_1, "");
    text_layer_set_text(text_layer_pt_departures_2_3, "");
    switch(alert){
        case NO_CONFIG:
            text_layer_set_text(text_layer_alert, "No config.");
            APP_LOG(APP_LOG_LEVEL_ERROR, "No config.");
            break;
        case ERR_LOC:
            text_layer_set_text(text_layer_alert, "Location error.");
            APP_LOG(APP_LOG_LEVEL_ERROR, "Location error.");
            break;
        case ERR_TIMEOUT:
            text_layer_set_text(text_layer_alert, "Timeout.");
            APP_LOG(APP_LOG_LEVEL_ERROR, "Timeout.");
            break;
        case ERR_HEALTH:
            text_layer_set_text(text_layer_alert, "PTV unhealthy.");
            APP_LOG(APP_LOG_LEVEL_ERROR, "PTV unhealthy.");
            break;
    }
}

static void display_pt_times() {
    // Clear any alerts
    text_layer_set_text(text_layer_alert, "");

    // Display the route names
    text_layer_set_text(text_layer_pt_route_short, string_route_short);
    text_layer_set_text(text_layer_pt_route_long, string_route_long);

    // Display the stop names
    text_layer_set_text(text_layer_pt_stop, string_stop);

    // Get the current time
    time_t epoch_now = time(NULL);

    // Calc the number of mins until each departure. It will truncate down but that's more conservative so ok.
    int time_diff_1 = (epoch_departure_1 - (int)epoch_now)/60;
    int time_diff_2 = (epoch_departure_2 - (int)epoch_now)/60;
    int time_diff_3 = (epoch_departure_3 - (int)epoch_now)/60;

    // Display departures
    if(time_diff_1<=0) {
        strcpy(string_departure_1, "NOW");
    } else {
        snprintf(string_departure_1, sizeof(string_departure_1), "%d", time_diff_1);
        strcat(string_departure_1, "mins");
    }
    if(time_diff_2<=0) {
        strcpy(string_departure_2, "NOW");
    } else {
        snprintf(string_departure_2, sizeof(string_departure_2), "%d", time_diff_2);
        strcat(string_departure_2, "mins");
    }
    if(time_diff_3<=0) {
        strcpy(string_departure_3, "NOW");
    } else {
        snprintf(string_departure_3, sizeof(string_departure_3), "%d", time_diff_3);
        strcat(string_departure_3, "mins");
    }

    strcpy(string_departure_2_3, string_departure_2);
    strcat(string_departure_2_3, ", ");
    strcat(string_departure_2_3, string_departure_3);

    text_layer_set_text(text_layer_pt_departures_1, string_departure_1);
    text_layer_set_text(text_layer_pt_departures_2_3, string_departure_2_3);
}

// Send dict to phone and do something
static void send_dict(int msg) {
    DictionaryIterator *dict;

    // Begin dictionary
    app_message_outbox_begin(&dict);

    // Add a key-value pair for each parameter
    dict_write_int8(dict, KEY_EVENT, msg);

    // Send the message!
    app_message_outbox_send();
}

// Run this function at every tick of the clock, i.e. second or minute
static void handle_tick(struct tm *tick_time, TimeUnits units){
    if(persist_read_bool(CONFIG)) {
        send_dict(first_launch ? ON_LAUNCH : ON_TICK);
        first_launch = false;
    } else {
        display_alert(NO_CONFIG);
    }
}

// Convenience function to create a text layer
static TextLayer *init_text_layer(GRect location, GColor colour, GColor background, GFont font, GTextAlignment alignment) {
    TextLayer *layer = text_layer_create(location);
    text_layer_set_text_color(layer, colour);
    text_layer_set_background_color(layer, background);
    text_layer_set_font(layer, font);
    text_layer_set_text_alignment(layer, alignment);

    return layer;
}

// Init the colors to use
static void init_colors() {
#ifdef PBL_COLOR
    color_bg_pt_route = GColorRed;
    color_bg_pt_stop = GColorBlue;
    color_bg_pt_departures = GColorRed;
    color_font_pt_route = GColorWhite;
    color_font_pt_stop = GColorWhite;
    color_font_pt_departures = GColorWhite;
#else
    color_bg_pt_route = GColorWhite;
    color_bg_pt_stop = GColorBlack;
    color_bg_pt_departures = GColorWhite;
    color_font_pt_route = GColorBlack;
    color_font_pt_stop = GColorWhite;;
    color_font_pt_departures = GColorBlack;
#endif
}

// Draw the background layer
static void draw_background(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    // Top, route layer
    graphics_context_set_fill_color(ctx, color_bg_pt_route);
    graphics_fill_rect(ctx, GRect(bounds.origin.x, bounds.origin.y, bounds.size.w, ROUTE_LAYER_BG_HEIGHT), GCornerNone, 0);
    // Middle, stop layer
    graphics_context_set_fill_color(ctx, color_bg_pt_stop);
    graphics_fill_rect(ctx, GRect(bounds.origin.x, ROUTE_LAYER_BG_HEIGHT, bounds.size.w, STOP_LAYER_BG_HEIGHT), GCornerNone, 0);
    // Bottom, departures layer
    graphics_context_set_fill_color(ctx, color_bg_pt_departures);
    graphics_fill_rect(ctx, GRect(bounds.origin.x, ROUTE_LAYER_BG_HEIGHT+STOP_LAYER_BG_HEIGHT, bounds.size.w, DEPARTURE_LAYER_BG_HEIGHT), GCornerNone, 0);
}

static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);

    init_colors();
    background_layer = layer_create(bounds);
    layer_set_update_proc(background_layer, draw_background);

    GFont font_route_short, font_route_long, font_stop, font_departure_1, font_departure_2_3;
    GRect text_layer_rect;

    font_route_short = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
    font_route_long = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
    font_stop = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
    font_departure_1 = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
    font_departure_2_3 = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);

    // font_time = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_28));
    // font_stop = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));
    // font_route = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));
    // font_route_time = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));

    // API Health Status layer
    text_layer_rect = (GRect) { .origin = { STOP_LAYER_X+TEXT_LAYER_PADDING, STOP_LAYER_Y }, .size = { bounds.size.w, STOP_LAYER_HEIGHT } };
    text_layer_alert = init_text_layer(text_layer_rect, color_font_pt_stop, GColorClear, font_route_short, GTextAlignmentCenter);
    text_layer_set_text(text_layer_alert, "");

    // Short Route layer (large text)
    text_layer_rect = (GRect) { .origin = { ROUTE_SHORT_LAYER_X + TEXT_LAYER_PADDING, ROUTE_SHORT_LAYER_Y }, .size = { bounds.size.w, ROUTE_SHORT_LAYER_HEIGHT } };
    text_layer_pt_route_short = init_text_layer(text_layer_rect, color_font_pt_route, GColorClear, font_route_short, GTextAlignmentLeft);
    text_layer_set_text(text_layer_pt_route_short, "Getting route...");

    // Long Route Layer (smaller text)
    text_layer_rect = (GRect) { .origin = { ROUTE_LONG_LAYER_X + TEXT_LAYER_PADDING, ROUTE_LONG_LAYER_Y }, .size = { bounds.size.w, ROUTE_LONG_LAYER_HEIGHT } };
    text_layer_pt_route_long = init_text_layer(text_layer_rect, color_font_pt_route, GColorClear, font_route_long, GTextAlignmentLeft);
    text_layer_set_text(text_layer_pt_route_long, "");

    // Stop Layer
    text_layer_rect = (GRect) { .origin = { STOP_LAYER_X + TEXT_LAYER_PADDING, STOP_LAYER_Y }, .size = { bounds.size.w - TEXT_LAYER_PADDING, STOP_LAYER_HEIGHT } };
    text_layer_pt_stop = init_text_layer(text_layer_rect, color_font_pt_stop, GColorClear, font_stop, GTextAlignmentCenter);
    text_layer_set_text(text_layer_pt_stop, "Getting stop...");

    // First departure layer
    text_layer_rect = (GRect) { .origin = { DEPARTURE_1_LAYER_X + TEXT_LAYER_PADDING, DEPARTURE_1_LAYER_Y }, .size = { bounds.size.w, DEPARTURE_1_LAYER_HEIGHT } };
    text_layer_pt_departures_1 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_departure_1, GTextAlignmentLeft);
    text_layer_set_text(text_layer_pt_departures_1, "Getting departures...");

    // Second and third departures layer
    text_layer_rect = (GRect) { .origin = { DEPARTURE_2_3_LAYER_X + TEXT_LAYER_PADDING, DEPARTURE_2_3_LAYER_Y }, .size = { bounds.size.w-TEXT_LAYER_PADDING, DEPARTURE_2_3_LAYER_HEIGHT } };
    text_layer_pt_departures_2_3 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_departure_2_3, GTextAlignmentRight);
    text_layer_set_text(text_layer_pt_departures_2_3, "");

    layer_add_child(window_layer, background_layer);
    layer_add_child(window_layer, text_layer_get_layer(text_layer_alert));
    layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route_short));
    layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route_long));
    layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_stop));
    layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_departures_1));
    layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_departures_2_3));
}

static void window_unload(Window *window) {
    layer_destroy(background_layer);
    text_layer_destroy(text_layer_alert);
    text_layer_destroy(text_layer_pt_route_short);
    text_layer_destroy(text_layer_pt_route_long);
    text_layer_destroy(text_layer_pt_stop);
    text_layer_destroy(text_layer_pt_departures_1);
    text_layer_destroy(text_layer_pt_departures_2_3);
}

static void init(void) {
    window = window_create();
    window_set_click_config_provider(window, click_config_provider);
    window_set_window_handlers(window, (WindowHandlers) {
        .load = window_load,
        .unload = window_unload,
    });
    const bool animated = true;
    window_stack_push(window, animated);

    // persist_delete(CONFIG);

    // Subscribe to ticker
    first_launch = true;
    tick_timer_service_subscribe(MINUTE_UNIT, handle_tick);

    // Subscribe to accelerometer
    accel_tap_service_subscribe(tap_handler);

    // Register callbacks
    app_message_register_inbox_received(inbox_received_callback);
    app_message_register_inbox_dropped(inbox_dropped_callback);
    app_message_register_outbox_failed(outbox_failed_callback);
    app_message_register_outbox_sent(outbox_sent_callback);
    // Open sesame
    app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
}

static void deinit(void) {
    window_destroy(window);
}

int main(void) {
    init();

    APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

    app_event_loop();
    deinit();
}

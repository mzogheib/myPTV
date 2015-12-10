#include <pebble.h>

// Dimensions
#define SCREEN_SIZE_W 144
#define SCREEN_SIZE_H 168

#define TIME_LAYER_BG_X 0
#define TIME_LAYER_BG_Y 0
#define TIME_LAYER_BG_HEIGHT 30
#define STOP_LAYER_BG_X 0
#define STOP_LAYER_BG_Y TIME_LAYER_BG_Y + TIME_LAYER_BG_HEIGHT
#define STOP_LAYER_BG_HEIGHT 26
#define DEPARTURES_LAYER_BG_X 0
#define DEPARTURES_LAYER_BG_Y STOP_LAYER_BG_Y + STOP_LAYER_BG_HEIGHT
#define DEPARTURES_LAYER_BG_HEIGHT SCREEN_SIZE_H - DEPARTURES_LAYER_BG_Y

#define TIME_LAYER_X 0
#define TIME_LAYER_Y 0
#define TIME_LAYER_HEIGHT 30
#define STOP_LAYER_X 0
#define STOP_LAYER_Y TIME_LAYER_Y + TIME_LAYER_HEIGHT
#define STOP_LAYER_HEIGHT 20

#define ROUTE1_LAYER_X 0
#define ROUTE1_LAYER_Y STOP_LAYER_Y + STOP_LAYER_HEIGHT + 6
#define ROUTE1_LAYER_HEIGHT 24
#define ROUTE1_TIMES_LAYER_X 0
#define ROUTE1_TIMES_LAYER_Y ROUTE1_LAYER_Y + ROUTE1_LAYER_HEIGHT - 6
#define ROUTE1_TIMES_LAYER_HEIGHT 24

#define ROUTE2_LAYER_X 0
#define ROUTE2_LAYER_Y ROUTE1_TIMES_LAYER_Y + ROUTE1_TIMES_LAYER_HEIGHT
#define ROUTE2_LAYER_HEIGHT 24
#define ROUTE2_TIMES_LAYER_X 0
#define ROUTE2_TIMES_LAYER_Y ROUTE2_LAYER_Y + ROUTE2_LAYER_HEIGHT - 6
#define ROUTE2_TIMES_LAYER_HEIGHT 24

#define TEXT_LAYER_PADDING 2


// Dictionary keys
#define KEY_MSG_TYPE 0
  
#define GET_PT_DATA 1
#define KEY_ROUTE1 10
#define KEY_ROUTE2 11
#define KEY_STOP 12
#define KEY_ROUTE1_TIME1 14
#define KEY_ROUTE1_TIME2 15
#define KEY_ROUTE1_TIME3 16
#define KEY_ROUTE2_TIME1 17
#define KEY_ROUTE2_TIME2 18
#define KEY_ROUTE2_TIME3 19

#define GET_USER_OPT 2
#define KEY_MODE_ID 20
#define KEY_ROUTE_ID 21
#define KEY_DIRECTION_ID 22
#define KEY_STOP_ID 23

#define GET_HEALTH 8
#define KEY_HEALTH 80

#define ERR_LOC 90
#define ERR_URL 91

static Window *window;
static Layer *background_layer;

static GColor color_bg_time, color_bg_pt_stop, color_bg_pt_departures;
static GColor color_font_time, color_font_pt_stop, color_font_pt_departures;

// Display
static TextLayer *text_layer_time;
static TextLayer *text_layer_pt_stop;
static TextLayer *text_layer_pt_route1, *text_layer_pt_route2;
static TextLayer *text_layer_pt_time1, *text_layer_pt_time2;
static TextLayer *text_layer_pt_health;

// Variables for storing the PT data
static char string_stop[40];
static char string_route1[40], string_route2[40];
static char string_route1_time1[] = "00:00", string_route1_time2[] = "00:00", string_route1_time3[] = "00:00", string_route2_time1[] = "00:00", string_route2_time2[] = "00:00", string_route2_time3[] = "00:00";
static char string_time[] = "00:00", string_route1_times[] = "00:00, 00:00, 00:00", string_route2_times[] = "00:00, 00:00, 00:00";
static uint32_t epoch_route1_time1, epoch_route1_time2, epoch_route1_time3, epoch_route2_time1, epoch_route2_time2, epoch_route2_time3;
static int health_status;

// Variables for storing config data
static char string_mode_id[2];
static char string_route_id[10];
static char string_direction_id[2];
static char string_stop_id[10];
static int new_config_received;

/* Funciton Prototypes */
static void display_pt_times();
static void write_time(struct tm tick_time, char *buffer);
static void sendDict(int msg_type);

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer_time, "Select");
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer_time, "Up");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer_time, "Down");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

// Process the dictionary sent from the phone
// e.g. save to variables
static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Message recieved from phone!");
	
  // Read first item
  Tuple *t = dict_read_first(iterator);

  // For all items
  while(t != NULL) {
    // Which key was received?
    switch(t->key) {
			// Received from the PTV API			
	    case KEY_ROUTE1:
				strcpy(string_route1, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_route1);
	      break;
	    case KEY_ROUTE2:
				strcpy(string_route2, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_route2);
	      break;
	    case KEY_STOP:
				strcpy(string_stop, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_stop);
	      break;
	    case KEY_ROUTE1_TIME1:
				epoch_route1_time1 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route1_time1);
	      break;
	    case KEY_ROUTE1_TIME2:
				epoch_route1_time2 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route1_time2);
	      break;
	    case KEY_ROUTE1_TIME3:
				epoch_route1_time3 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route1_time3);
	      break;
	    case KEY_ROUTE2_TIME1:
				epoch_route2_time1 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route2_time1);
	      break;
	    case KEY_ROUTE2_TIME2:
				epoch_route2_time2 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route2_time2);
	      break;
	    case KEY_ROUTE2_TIME3:
				epoch_route2_time3 = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_route2_time3);
	      break;
			// Received from the app config page 
	    case KEY_MODE_ID:
				strcpy(string_mode_id, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_mode_id);
				persist_write_string(KEY_MODE_ID, string_mode_id);
				new_config_received = 1;
	      break;
		  case KEY_ROUTE_ID:
				strcpy(string_route_id, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_route_id);
				persist_write_string(KEY_ROUTE_ID, string_route_id);
				new_config_received = 1;
		    break;
	    case KEY_DIRECTION_ID:
				strcpy(string_direction_id, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_direction_id);
				persist_write_string(KEY_DIRECTION_ID, string_direction_id);
				new_config_received = 1;
	      break;
	    case KEY_STOP_ID:
				strcpy(string_stop_id, t->value->cstring);
				APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_stop_id);
				persist_write_string(KEY_STOP_ID, string_stop_id);
				new_config_received = 1;
	      break;		
			case KEY_HEALTH:
				health_status = t->value->int32;
				APP_LOG(APP_LOG_LEVEL_INFO, "Received Health: %d", (int)health_status);
				break;
			// Error handling
		  case KEY_MSG_TYPE:
				switch(t->value->uint8) {
					case ERR_LOC:
		      APP_LOG(APP_LOG_LEVEL_ERROR, "Location timeout.");
					case ERR_URL:
		      APP_LOG(APP_LOG_LEVEL_ERROR, "URL timeout");	
				}
		    break;
	    default:
	      APP_LOG(APP_LOG_LEVEL_ERROR, "Key %d not recognized!", (int)t->key);
	      break;
    }

    // Look for next item
    t = dict_read_next(iterator);
  }	
	
	// Try to differentiate between receiving config data and PT data
	if(new_config_received) {
    APP_LOG(APP_LOG_LEVEL_INFO, "New config options received and sending to phone!");
		
		// Request new times based on new config data
		sendDict(GET_PT_DATA);	
		new_config_received = 0;
	}
	
	if(health_status==0) {
		// Display some unavailable message
		text_layer_set_text(text_layer_pt_health, "Departures unavailable.");
		// Make all other layers blank
	} else {
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
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}

static void display_pt_times() {
	
	// Display the route names
	text_layer_set_text(text_layer_pt_route1, string_route1);
	text_layer_set_text(text_layer_pt_route2, string_route2);
	
	// Display the stop names
	text_layer_set_text(text_layer_pt_stop, string_stop);
	
	// Make the time structs and displays the next 3 for each route/stop
  time_t temp_time = epoch_route1_time1; 
  struct tm *tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route1_time1);
	temp_time = epoch_route1_time2;	
	tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route1_time2);
	temp_time = epoch_route1_time3;	
	tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route1_time3);
	strcpy(string_route1_times, string_route1_time1);
	strcat(string_route1_times, ", ");
	strcat(string_route1_times, string_route1_time2);	
	strcat(string_route1_times, ", ");
	strcat(string_route1_times, string_route1_time3);	
  text_layer_set_text(text_layer_pt_time1, string_route1_times);
  
  temp_time = epoch_route2_time1; 
  tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route2_time1);
	temp_time = epoch_route2_time2;	
	tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route2_time2);
	temp_time = epoch_route2_time3;	
	tick_time = localtime(&temp_time);
	write_time(*tick_time, string_route2_time3);
	strcpy(string_route2_times, string_route2_time1);
	strcat(string_route2_times, ", ");
	strcat(string_route2_times, string_route2_time2);	
	strcat(string_route2_times, ", ");
	strcat(string_route2_times, string_route2_time3);
  text_layer_set_text(text_layer_pt_time2, string_route2_times);
  
 
}

// Send dict to phone and do something
static void sendDict(int msg_type) {
	// Begin dictionary
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
	
  // Add a key-value pair for each parameter
  dict_write_cstring(iter, KEY_MODE_ID, string_mode_id);
  dict_write_cstring(iter, KEY_ROUTE_ID, string_route_id);
  dict_write_cstring(iter, KEY_DIRECTION_ID, string_direction_id);
  dict_write_cstring(iter, KEY_STOP_ID, string_stop_id);
  
  // Send the message!
  app_message_outbox_send();
}

// Returns the time
static void write_time(struct tm tick_time, char *buffer) {

  // Write the current hours and minutes into the buffer
  if(clock_is_24h_style() == true) {
    // Use 24 hour format
    strftime(buffer, sizeof("00:00"), "%H:%M", &tick_time);
  } else {
    // Use 12 hour format
    strftime(buffer, sizeof("00:00"), "%I:%M", &tick_time);
  }
   
  // Strip leading zero
  if(buffer[0]=='0') strcpy(buffer, buffer+1);
  
	//APP_LOG(APP_LOG_LEVEL_INFO, "Buffer: %s", buffer);
	
}

// Run this function at every tick of the clock, i.e. second or minute
static void handle_tick(struct tm *tick_time, TimeUnits units){  
  // Write the current time and date
	write_time(*tick_time, string_time);
  text_layer_set_text(text_layer_time, string_time);
  // Request new PT times
	sendDict(GET_PT_DATA);	
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
	color_bg_time = GColorWhite;
	color_bg_pt_stop = GColorBlue;
	color_bg_pt_departures = GColorRed;
	color_font_time = GColorBlack;
	color_font_pt_stop = GColorWhite;; 
	color_font_pt_departures = GColorWhite;
	#else
	color_bg_time = GColorWhite;
	color_bg_pt_stop = GColorBlack;
	color_bg_pt_departures = GColorBlack;
	color_font_time = GColorBlack;
	color_font_pt_stop = GColorWhite;; 
	color_font_pt_departures = GColorWhite;
	#endif
}

// Draw the background layer
static void draw_background(Layer *layer, GContext *ctx) {
	GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, color_bg_time);
	graphics_fill_rect(ctx, GRect(bounds.origin.x, bounds.origin.y, bounds.size.w, TIME_LAYER_BG_HEIGHT), GCornerNone, 0);
  graphics_context_set_fill_color(ctx, color_bg_pt_stop);
	graphics_fill_rect(ctx, GRect(bounds.origin.x, TIME_LAYER_BG_HEIGHT, bounds.size.w, STOP_LAYER_BG_HEIGHT), GCornerNone, 0);
  graphics_context_set_fill_color(ctx, color_bg_pt_departures);
	graphics_fill_rect(ctx, GRect(bounds.origin.x, TIME_LAYER_BG_HEIGHT+STOP_LAYER_BG_HEIGHT, bounds.size.w, DEPARTURES_LAYER_BG_HEIGHT), GCornerNone, 0);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
	
	init_colors();
	background_layer = layer_create(bounds);
  layer_set_update_proc(background_layer, draw_background);
	
	GFont font_time, font_route, font_stop, font_route_time;
	GRect text_layer_rect;
	
	//font_time = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
	font_stop = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
	font_route = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
	font_route_time = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
	
	font_time = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_28));
	//font_stop = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));
	//font_route = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));
	//font_route_time = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_20));

	// Main time layer
	text_layer_rect = (GRect) { .origin = { TIME_LAYER_X, TIME_LAYER_Y-2 }, .size = { bounds.size.w, TIME_LAYER_HEIGHT+4 } };
  text_layer_time = init_text_layer(text_layer_rect, color_font_time, GColorClear, font_time, GTextAlignmentCenter);
	
	// API Health Status layer
	text_layer_rect = (GRect) { .origin = { STOP_LAYER_X+TEXT_LAYER_PADDING, STOP_LAYER_Y }, .size = { bounds.size.w, STOP_LAYER_HEIGHT } };
  text_layer_pt_health = init_text_layer(text_layer_rect, color_font_pt_stop, GColorClear, font_route, GTextAlignmentCenter);
  text_layer_set_text(text_layer_pt_health, "");
	
	// Stop Layer (same height as health layer)
	text_layer_rect = (GRect) { .origin = { STOP_LAYER_X+TEXT_LAYER_PADDING, STOP_LAYER_Y }, .size = { bounds.size.w, STOP_LAYER_HEIGHT } };
	text_layer_pt_stop = init_text_layer(text_layer_rect, color_font_pt_stop, GColorClear, font_stop, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_stop, "Getting stop ...");
	
	// First Route Layer
	text_layer_rect = (GRect) { .origin = { ROUTE1_LAYER_X+TEXT_LAYER_PADDING, ROUTE1_LAYER_Y }, .size = { bounds.size.w, ROUTE1_LAYER_HEIGHT } };
  text_layer_pt_route1 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_route, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route1, "Getting route 1...");
	// First Route Times Layer
	text_layer_rect = (GRect) { .origin = { ROUTE1_TIMES_LAYER_X+TEXT_LAYER_PADDING, ROUTE1_TIMES_LAYER_Y }, .size = { bounds.size.w, ROUTE1_TIMES_LAYER_HEIGHT } };
  text_layer_pt_time1 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_route_time, GTextAlignmentRight);
  text_layer_set_text(text_layer_pt_time1, "Getting times...");
	
	// Second Route Layer
	text_layer_rect = (GRect) { .origin = { ROUTE2_LAYER_X+TEXT_LAYER_PADDING, ROUTE2_LAYER_Y }, .size = { bounds.size.w, ROUTE2_LAYER_HEIGHT } };
  text_layer_pt_route2 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_route, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route2, "Getting route 2...");
	// Second Route Times Layer
	text_layer_rect = (GRect) { .origin = { ROUTE2_TIMES_LAYER_X+TEXT_LAYER_PADDING, ROUTE2_TIMES_LAYER_Y }, .size = { bounds.size.w, ROUTE2_TIMES_LAYER_HEIGHT } };
  text_layer_pt_time2 = init_text_layer(text_layer_rect, color_font_pt_departures, GColorClear, font_route_time, GTextAlignmentRight);
  text_layer_set_text(text_layer_pt_time2, "Getting times...");
  
  layer_add_child(window_layer, background_layer);
	layer_add_child(window_layer, text_layer_get_layer(text_layer_time));
	layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_health));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_stop));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route2));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time2));
	
}

static void window_unload(Window *window) {
	layer_destroy(background_layer);
  text_layer_destroy(text_layer_time);
	text_layer_destroy(text_layer_pt_health); 
  text_layer_destroy(text_layer_pt_stop);
  text_layer_destroy(text_layer_pt_route1);
  text_layer_destroy(text_layer_pt_route2);
  text_layer_destroy(text_layer_pt_time1);
  text_layer_destroy(text_layer_pt_time2);
	
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
	
	// If any previously saved config data then recall and save
  persist_read_string(KEY_MODE_ID, string_mode_id, 2);
  persist_read_string(KEY_ROUTE_ID, string_route_id, 10);
  persist_read_string(KEY_DIRECTION_ID, string_direction_id, 2);
  persist_read_string(KEY_STOP_ID, string_stop_id, 10);
	
  // Time for display on start up
  time_t temp_time = time(NULL); 
  struct tm *tick_time = localtime(&temp_time);
  // Write the current time and date
	write_time(*tick_time, string_time);
  text_layer_set_text(text_layer_time, string_time);
  // Subcribe to ticker 
  tick_timer_service_subscribe(MINUTE_UNIT, handle_tick);	
	
	// Set the config received flag to false initially
	new_config_received = 0;
	
  // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);

  // Open AppMessage
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

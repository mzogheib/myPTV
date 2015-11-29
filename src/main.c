#include <pebble.h>

// Dimensions
#define TIME_LAYER_HEIGHT 24
#define ROUTE_LAYER_HEIGHT 24
#define STOP_LAYER_HEIGHT 24
#define ROUTE_TIMES_LAYER_HEIGHT 24
#define TEXT_LAYER_PADDING 2
#define SCREEN_SIZE_W 144
#define SCREEN_SIZE_H 168

// Dictionary keys
#define KEY_MSG_TYPE 0
  
#define GET_PT_DATA 1
#define KEY_ROUTE1 10
#define KEY_ROUTE2 11
#define KEY_STOP1 12
#define KEY_STOP2 13
#define KEY_ROUTE1_TIME1 14
#define KEY_ROUTE1_TIME2 15
#define KEY_ROUTE1_TIME3 16
#define KEY_ROUTE2_TIME1 17
#define KEY_ROUTE2_TIME2 18
#define KEY_ROUTE2_TIME3 19

#define GET_HEALTH 8
#define KEY_HEALTH 80

#define ERR_LOC 90
#define ERR_URL 91


static Window *window;
static TextLayer *text_layer_time;
static TextLayer *text_layer_pt_route1, *text_layer_pt_route2;
static TextLayer *text_layer_pt_stop1, *text_layer_pt_stop2;
static TextLayer *text_layer_pt_time1, *text_layer_pt_time2;
static TextLayer *text_layer_pt_health;
// Variabls for storing the PT data
static char string_route1[40], string_route2[40];
static char string_stop1[40], string_stop2[40];
static char string_route1_time1[] = "00:00", string_route1_time2[] = "00:00", string_route1_time3[] = "00:00", string_route2_time1[] = "00:00", string_route2_time2[] = "00:00", string_route2_time3[] = "00:00";
static char string_time[] = "00:00", string_route1_times[] = "00:00, 00:00, 00:00", string_route2_times[] = "00:00, 00:00, 00:00";
static uint32_t epoch_route1_time1, epoch_route1_time2, epoch_route1_time3, epoch_route2_time1, epoch_route2_time2, epoch_route2_time3;
static int health_status;

/* Funciton Prototypes */
static void display_pt_times();
static void write_time(struct tm tick_time, char *buffer);

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
    case KEY_ROUTE1:
			strcpy(string_route1, t->value->cstring);
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_route1);
      break;
    case KEY_ROUTE2:
			strcpy(string_route2, t->value->cstring);
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_route2);
      break;
    case KEY_STOP1:
			strcpy(string_stop1, t->value->cstring);
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_stop1);
      break;
    case KEY_STOP2:
			strcpy(string_stop2, t->value->cstring);
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", string_stop2);
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
		case KEY_HEALTH:
			health_status = t->value->int32;
			APP_LOG(APP_LOG_LEVEL_INFO, "Received Health: %d", (int)health_status);
			break;
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
	if(health_status==0) {
		// Display some unavailable message
		text_layer_set_text(text_layer_pt_health, "Departures unavailable.");
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
	text_layer_set_text(text_layer_pt_stop1, string_stop1);
	text_layer_set_text(text_layer_pt_stop2, string_stop2);
	
	// Make the time structs and displays the next 2 for each route/stop
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

  // Add a key-value pair
  dict_write_uint8(iter, KEY_MSG_TYPE, msg_type);
  
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
  
	// Begin dictionary
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  // Add a key-value pair
  dict_write_uint8(iter, KEY_MSG_TYPE, GET_PT_DATA);
  
  // Send the message!
  app_message_outbox_send();
	
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

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
	GFont font_time, font_route, font_stop, font_route_time;
	GRect text_layer_rect;
	int rectOriginY = 0;
	font_time = fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD);
	//font_time = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_CUSTOM_FONT_26));
	font_route = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);
	font_stop = fonts_get_system_font(FONT_KEY_GOTHIC_18);
	font_route_time = fonts_get_system_font(FONT_KEY_GOTHIC_18);
	

	// Main time layer
	text_layer_rect = (GRect) { .origin = { 0, rectOriginY-2 }, .size = { bounds.size.w, TIME_LAYER_HEIGHT+4 } };
  text_layer_time = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_time, GTextAlignmentCenter);
	
	// API Health Status layer
	rectOriginY += TIME_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, ROUTE_LAYER_HEIGHT } };
  text_layer_pt_health = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_route, GTextAlignmentCenter);
  text_layer_set_text(text_layer_pt_health, "");
	
	// First Route Layer
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, ROUTE_LAYER_HEIGHT } };
  text_layer_pt_route1 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_route, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route1, "Getting route 1...");
	// First Stop Layer
	rectOriginY += ROUTE_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, STOP_LAYER_HEIGHT } };
	text_layer_pt_stop1 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_stop, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_stop1, "Getting stop 1...");
	// First Route Times Layer
	rectOriginY += STOP_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, ROUTE_TIMES_LAYER_HEIGHT } };
  text_layer_pt_time1 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_route_time, GTextAlignmentCenter);
  text_layer_set_text(text_layer_pt_time1, "Getting times...");
	
	// Second Route Layer
	rectOriginY += ROUTE_TIMES_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, ROUTE_LAYER_HEIGHT } };
  text_layer_pt_route2 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_route, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route2, "Getting route 2...");
	// Second Stop Layer
	rectOriginY += ROUTE_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, STOP_LAYER_HEIGHT } };
  text_layer_pt_stop2 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_stop, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_stop2, "Getting stop 2...");
	// Second Route Times Layer
	rectOriginY += STOP_LAYER_HEIGHT;
	text_layer_rect = (GRect) { .origin = { TEXT_LAYER_PADDING, rectOriginY }, .size = { bounds.size.w, ROUTE_TIMES_LAYER_HEIGHT } };
  text_layer_pt_time2 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font_route_time, GTextAlignmentCenter);
  text_layer_set_text(text_layer_pt_time2, "Getting times...");
  
	layer_add_child(window_layer, text_layer_get_layer(text_layer_time));
	layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_health));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route2));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_stop1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_stop2));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time2));
	
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer_time);
	text_layer_destroy(text_layer_pt_health); 
  text_layer_destroy(text_layer_pt_route1);
  text_layer_destroy(text_layer_pt_route2);
  text_layer_destroy(text_layer_pt_stop1);
  text_layer_destroy(text_layer_pt_stop2);
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
	
  // Time for display on start up
  time_t temp_time = time(NULL); 
  struct tm *tick_time = localtime(&temp_time);
  // Write the current time and date
	write_time(*tick_time, string_time);
  text_layer_set_text(text_layer_time, string_time);
  // Subcribe to ticker 
  tick_timer_service_subscribe(MINUTE_UNIT, handle_tick);	
	
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

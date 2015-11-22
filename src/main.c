#include <pebble.h>

// Dimensions
#define TIME_LAYER_HEIGHT 35
#define SCREEN_SIZE_W 144
#define SCREEN_SIZE_H 168

// Dictionary keys
#define KEY_MSG_TYPE 0
  
#define GET_PT_DATA 1
#define KEY_ROUTE 10
#define KEY_TIME1 11
#define KEY_TIME2 12
#define KEY_TIME3 13
#define ERR_LOC 90
#define ERR_URL 91


static Window *window;
static TextLayer *text_layer_time;
static TextLayer *text_layer_pt_route1, *text_layer_pt_route2, *text_layer_pt_route3; 
static TextLayer *text_layer_pt_time1, *text_layer_pt_time2, *text_layer_pt_time3;
// Need separate buffers for each route direction and time display
static char string_route[4];
static char string_time[] = "00:00", string_time1[] = "00:00", string_time2[] = "00:00", string_time3[] = "00:00";
static uint32_t epoch_time1, epoch_time2, epoch_time3;

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
    case KEY_ROUTE:
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %s", t->value->cstring);
			strcpy(string_route, t->value->cstring);
      break;
    case KEY_TIME1:
			epoch_time1 = t->value->int32;
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_time1);
      break;
    case KEY_TIME2:
			epoch_time2 = t->value->int32;
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_time2);
      break;
    case KEY_TIME3:
			epoch_time3 = t->value->int32;
			APP_LOG(APP_LOG_LEVEL_INFO, "Received: %d", (int)epoch_time3);
			
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
	
	display_pt_times();
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
	
	// Display the route number
	text_layer_set_text(text_layer_pt_route1, string_route);
	text_layer_set_text(text_layer_pt_route2, "");
	
	// Make the time structs and displays the next 3
  time_t temp_time = epoch_time1; 
  struct tm *tick_time = localtime(&temp_time);
	write_time(*tick_time, string_time1);
  text_layer_set_text(text_layer_pt_time1, string_time1);
  
  temp_time = epoch_time2; 
  tick_time = localtime(&temp_time);
	write_time(*tick_time, string_time2);
  text_layer_set_text(text_layer_pt_time2, string_time2);	
  
  temp_time = epoch_time3; 
  tick_time = localtime(&temp_time);
	write_time(*tick_time, string_time3);
  text_layer_set_text(text_layer_pt_time3, string_time3);
}

// Returns the time
static void write_time(struct tm tick_time, char *buffer) {
  // Create a long-lived buffer
  //char *buffer = "00:00";

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
	
	
  //return buffer;
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
	GFont font;
	GRect text_layer_rect;

	text_layer_rect = (GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, TIME_LAYER_HEIGHT } };
	font = fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD);
  text_layer_time = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentCenter);
	
	text_layer_rect = (GRect) { .origin = { 2, TIME_LAYER_HEIGHT }, .size = { bounds.size.w, SCREEN_SIZE_H - TIME_LAYER_HEIGHT } };
	font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
  text_layer_pt_route1 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route1, "PTV Route");
	
	text_layer_rect = (GRect) { .origin = { 2, TIME_LAYER_HEIGHT+20 }, .size = { bounds.size.w, SCREEN_SIZE_H - TIME_LAYER_HEIGHT-20 } };
	//font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
  text_layer_pt_route2 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentLeft);
  text_layer_set_text(text_layer_pt_route2, "PTV Route");
	
	text_layer_rect = (GRect) { .origin = { -2, TIME_LAYER_HEIGHT }, .size = { bounds.size.w, SCREEN_SIZE_H - TIME_LAYER_HEIGHT } };
	//font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
  text_layer_pt_time1 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentRight);
  text_layer_set_text(text_layer_pt_time1, "PTV time");
	
	text_layer_rect = (GRect) { .origin = { -2, TIME_LAYER_HEIGHT+20 }, .size = { bounds.size.w, SCREEN_SIZE_H - TIME_LAYER_HEIGHT-20 } };
	//font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
  text_layer_pt_time2 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentRight);
  text_layer_set_text(text_layer_pt_time2, "PTV time");
	
	text_layer_rect = (GRect) { .origin = { -2, TIME_LAYER_HEIGHT+40 }, .size = { bounds.size.w, SCREEN_SIZE_H - TIME_LAYER_HEIGHT-40 } };
	//font = fonts_get_system_font(FONT_KEY_GOTHIC_24);
  text_layer_pt_time3 = init_text_layer(text_layer_rect, GColorBlack, GColorClear, font, GTextAlignmentRight);
  text_layer_set_text(text_layer_pt_time3, "PTV time");
  
	layer_add_child(window_layer, text_layer_get_layer(text_layer_time));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_route2));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time1));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time2));
  layer_add_child(window_layer, text_layer_get_layer(text_layer_pt_time3));
	
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer_time);
  text_layer_destroy(text_layer_pt_route1);
  text_layer_destroy(text_layer_pt_route2);
  text_layer_destroy(text_layer_pt_time1);
  text_layer_destroy(text_layer_pt_time2);
  text_layer_destroy(text_layer_pt_time3);
	
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

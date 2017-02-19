Rails.application.routes.draw do

  root 'homepage#show'

  # get '/session' => 'sessions#session', as: :session
  get '/session' => 'sessions#host', as: :game_host
  get '/session/:game_uuid' => 'sessions#client', as: :game_player

  mount ActionCable.server => '/cable'
end

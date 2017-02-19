Rails.application.routes.draw do

  root 'homepage#show'

  mount ActionCable.server => '/cable'
end

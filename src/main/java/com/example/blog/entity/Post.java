package com.example.blog.entity;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class Post {
    private Long id;
    private Long authorId;
    private String title;
    private String content;
    private String summary;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String authorName;
    private List<String> tags;
}

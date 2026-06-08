package com.example.blog.mapper;

import com.example.blog.entity.Post;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface PostMapper {
    List<Post> findPublished();

    Post findPublishedById(@Param("id") Long id);

    Post findById(@Param("id") Long id);

    List<Post> findByAuthorId(@Param("authorId") Long authorId);

    int insert(Post post);

    int updateByAuthor(Post post);

    int deleteByAuthor(@Param("id") Long id, @Param("authorId") Long authorId);

    List<String> findTagNamesByPostId(@Param("postId") Long postId);

    int insertTagIfAbsent(@Param("name") String name);

    int insertPostTag(@Param("postId") Long postId, @Param("tagName") String tagName);

    int deleteTagsByPostId(@Param("postId") Long postId);
}
